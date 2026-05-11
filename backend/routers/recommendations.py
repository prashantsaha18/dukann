from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import uuid
from database import get_db
from ml.basket_analysis import run_basket_analysis, build_affinity_matrix
from ml.placement_optimizer import (
    compute_placement_scores, get_top_recommendations,
    ProductMetrics, ZoneInfo,
)

router = APIRouter()


@router.post("/run")
async def run_ml_pipeline(db: AsyncSession = Depends(get_db)):
    """
    Full ML pipeline:
      1. Fetch all transactions from DB
      2. Run FP-Growth to find association rules
      3. Persist association rules
      4. Score every product × zone pair
      5. Persist top placement recommendations
    """
    try:
        # ── 1. Load transactions ──────────────────────────────────
        rows = (await db.execute(text("""
            SELECT t.id::text, ti.product_id::text
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transaction_id
            ORDER BY t.id
        """))).fetchall()

        txn_map: dict = {}
        for row in rows:
            txn_map.setdefault(row[0], []).append(row[1])
        transactions = list(txn_map.values())

        # ── 2. FP-Growth ─────────────────────────────────────────
        rules = run_basket_analysis(
            transactions,
            min_support=0.008,
            min_confidence=0.15,
            min_lift=1.0,
        )

        # ── 3. Persist associations ───────────────────────────────
        await db.execute(text("DELETE FROM product_associations"))
        for rule in rules:
            if len(rule["if_buy"]) == 1 and len(rule["also_buy"]) == 1:
                await db.execute(text("""
                    INSERT INTO product_associations
                        (id, product_a, product_b, support, confidence, lift, calculated_at)
                    VALUES (:id::uuid, :pa::uuid, :pb::uuid, :s, :c, :l, NOW())
                    ON CONFLICT (product_a, product_b) DO UPDATE
                        SET support=EXCLUDED.support,
                            confidence=EXCLUDED.confidence,
                            lift=EXCLUDED.lift
                """), {
                    "id": str(uuid.uuid4()),
                    "pa": rule["if_buy"][0],
                    "pb": rule["also_buy"][0],
                    "s":  rule["support"],
                    "c":  rule["confidence"],
                    "l":  rule["lift"],
                })

        # ── 4. Load products with velocity ────────────────────────
        prod_rows = (await db.execute(text("""
            SELECT
                p.id::text, p.name, p.category,
                CAST(p.price AS FLOAT), CAST(p.cost AS FLOAT),
                p.shelf_life_days,
                COALESCE(SUM(ti.quantity), 0) AS total_sold,
                CASE WHEN COUNT(DISTINCT DATE(t.transaction_date)) > 0
                     THEN SUM(ti.quantity)::FLOAT / COUNT(DISTINCT DATE(t.transaction_date))
                     ELSE 0 END AS daily_velocity
            FROM products p
            LEFT JOIN transaction_items ti ON p.id = ti.product_id
            LEFT JOIN transactions t       ON ti.transaction_id = t.id
            WHERE p.is_active = TRUE
            GROUP BY p.id, p.name, p.category, p.price, p.cost, p.shelf_life_days
        """))).fetchall()

        products = [
            ProductMetrics(
                product_id=row[0], name=row[1], category=row[2],
                price=row[3], cost=row[4], shelf_life_days=row[5],
                total_sold=row[6], daily_velocity=row[7],
            )
            for row in prod_rows
        ]

        # ── 5. Load zones with current placements ─────────────────
        zone_rows = (await db.execute(text("""
            SELECT
                sz.id::text, sz.name, sz.zone_type,
                sz.visibility_score, sz.capacity,
                COALESCE(
                    ARRAY_AGG(pp.product_id::text)
                    FILTER (WHERE pp.is_current = TRUE),
                    '{}'
                ) AS current_products
            FROM store_zones sz
            LEFT JOIN product_placements pp ON sz.id = pp.zone_id
            GROUP BY sz.id, sz.name, sz.zone_type, sz.visibility_score, sz.capacity
        """))).fetchall()

        zones = [
            ZoneInfo(
                zone_id=row[0], name=row[1], zone_type=row[2],
                visibility_score=row[3], capacity=row[4],
                current_products=list(row[5]) if row[5] else [],
            )
            for row in zone_rows
        ]

        # ── 6. Score and recommend ────────────────────────────────
        affinity_matrix = build_affinity_matrix([p.product_id for p in products], rules)
        scores          = compute_placement_scores(products, zones, affinity_matrix)
        zone_recs       = get_top_recommendations(scores, zones, per_zone=5)

        # ── 7. Persist recommendations ────────────────────────────
        await db.execute(text(
            "DELETE FROM placement_recommendations WHERE is_applied = FALSE"
        ))

        saved = []
        for zone_id, zone_scores in zone_recs.items():
            for s in zone_scores:
                await db.execute(text("""
                    INSERT INTO placement_recommendations
                        (id, product_id, recommended_zone_id, placement_score, reason, generated_at, is_applied)
                    VALUES (:id::uuid, :pid::uuid, :zid::uuid, :score, :reason, NOW(), FALSE)
                """), {
                    "id":     str(uuid.uuid4()),
                    "pid":    s.product_id,
                    "zid":    s.zone_id,
                    "score":  s.total_score,
                    "reason": s.reason,
                })
                saved.append({"product_id": s.product_id, "zone_id": s.zone_id, "score": s.total_score})

        await db.commit()

        return {
            "status":                    "success",
            "transactions_analyzed":     len(transactions),
            "association_rules_found":   len(rules),
            "recommendations_generated": len(saved),
            "top_associations":          rules[:5],
            "recommendations":           saved[:20],
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_recommendations(db: AsyncSession = Depends(get_db)):
    """Return all current recommendations with product + zone details."""
    r = await db.execute(text("""
        SELECT
            pr.id::text,
            p.id::text,  p.name,     p.category,
            CAST(p.price AS FLOAT),  CAST(p.cost AS FLOAT),
            sz.id::text, sz.name,    sz.zone_type,
            sz.visibility_score,     sz.position_x, sz.position_y,
            CAST(pr.placement_score AS FLOAT),
            pr.reason,   pr.is_applied, pr.generated_at
        FROM placement_recommendations pr
        JOIN products    p  ON pr.product_id          = p.id
        JOIN store_zones sz ON pr.recommended_zone_id = sz.id
        ORDER BY pr.placement_score DESC
    """))
    rows = r.fetchall()
    return [
        {
            "id": row[0],
            "product": {
                "id": row[1], "name": row[2], "category": row[3],
                "price": row[4], "cost": row[5],
                "margin_pct": round((row[4] - row[5]) / row[4] * 100, 1) if row[4] > 0 else 0,
            },
            "zone": {
                "id": row[6], "name": row[7], "type": row[8],
                "visibility_score": row[9], "x": row[10], "y": row[11],
            },
            "score":        row[12],
            "reason":       row[13],
            "is_applied":   row[14],
            "generated_at": row[15].isoformat() if row[15] else None,
        }
        for row in rows
    ]


@router.get("/associations")
async def get_associations(db: AsyncSession = Depends(get_db)):
    """Return all computed basket association rules."""
    r = await db.execute(text("""
        SELECT
            pa.id::text,
            p1.id::text, p1.name, p1.category,
            p2.id::text, p2.name, p2.category,
            CAST(pa.support    AS FLOAT),
            CAST(pa.confidence AS FLOAT),
            CAST(pa.lift       AS FLOAT)
        FROM product_associations pa
        JOIN products p1 ON pa.product_a = p1.id
        JOIN products p2 ON pa.product_b = p2.id
        ORDER BY pa.lift DESC
        LIMIT 60
    """))
    rows = r.fetchall()
    return [
        {
            "id": row[0],
            "product_a": {"id": row[1], "name": row[2], "category": row[3]},
            "product_b": {"id": row[4], "name": row[5], "category": row[6]},
            "support":    row[7],
            "confidence": row[8],
            "lift":       row[9],
            "strength":   (
                "STRONG" if row[9] >= 2.5 else
                "MEDIUM" if row[9] >= 1.5 else
                "WEAK"
            ),
        }
        for row in rows
    ]


@router.post("/{rec_id}/apply")
async def apply_recommendation(rec_id: str, db: AsyncSession = Depends(get_db)):
    """Apply a recommendation — physically move the product to the new zone."""
    row = (await db.execute(text("""
        SELECT product_id, recommended_zone_id
        FROM placement_recommendations
        WHERE id = :id::uuid
    """), {"id": rec_id})).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    # Remove old placements for this product
    await db.execute(text("""
        UPDATE product_placements
        SET is_current = FALSE
        WHERE product_id = :pid::uuid
    """), {"pid": str(row[0])})

    # Insert new placement
    await db.execute(text("""
        INSERT INTO product_placements (id, product_id, zone_id, placed_at, is_current)
        VALUES (:id::uuid, :pid::uuid, :zid::uuid, NOW(), TRUE)
        ON CONFLICT (zone_id, product_id)
        DO UPDATE SET is_current = TRUE, placed_at = NOW()
    """), {
        "id":  str(uuid.uuid4()),
        "pid": str(row[0]),
        "zid": str(row[1]),
    })

    # Mark recommendation as applied
    await db.execute(text("""
        UPDATE placement_recommendations
        SET is_applied = TRUE
        WHERE id = :id::uuid
    """), {"id": rec_id})

    await db.commit()
    return {"status": "applied", "recommendation_id": rec_id}
