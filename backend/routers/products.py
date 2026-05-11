from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
import uuid
from database import get_db

router = APIRouter()

class ProductIn(BaseModel):
    name: str
    category: str
    price: float
    cost: float
    stock_quantity: int = 0
    shelf_life_days: int = 365
    weight_kg: float = 0.0


@router.get("/")
async def list_products(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT
            p.id::text, p.name, p.category,
            CAST(p.price AS FLOAT), CAST(p.cost AS FLOAT),
            p.stock_quantity, p.shelf_life_days, p.is_active,
            COALESCE(SUM(ti.quantity), 0) AS total_sold,
            CASE WHEN COUNT(DISTINCT DATE(t.transaction_date)) > 0
                 THEN SUM(ti.quantity)::FLOAT / COUNT(DISTINCT DATE(t.transaction_date))
                 ELSE 0 END AS daily_velocity,
            sz.name AS current_zone
        FROM products p
        LEFT JOIN transaction_items ti ON p.id = ti.product_id
        LEFT JOIN transactions t       ON ti.transaction_id = t.id
        LEFT JOIN product_placements pp ON p.id = pp.product_id AND pp.is_current = TRUE
        LEFT JOIN store_zones sz        ON pp.zone_id = sz.id
        WHERE p.is_active = TRUE
        GROUP BY p.id, p.name, p.category, p.price, p.cost,
                 p.stock_quantity, p.shelf_life_days, p.is_active, sz.name
        ORDER BY total_sold DESC
    """))
    rows = r.fetchall()
    return [
        {
            "id": row[0], "name": row[1], "category": row[2],
            "price": row[3], "cost": row[4],
            "stock_quantity": row[5], "shelf_life_days": row[6], "is_active": row[7],
            "total_sold": row[8],
            "daily_velocity": round(row[9], 2),
            "margin_pct": round((row[3] - row[4]) / row[3] * 100, 1) if row[3] > 0 else 0,
            "current_zone": row[10],
        }
        for row in rows
    ]


@router.post("/")
async def create_product(p: ProductIn, db: AsyncSession = Depends(get_db)):
    pid = str(uuid.uuid4())
    await db.execute(text("""
        INSERT INTO products (id, name, category, price, cost, stock_quantity, shelf_life_days, weight_kg)
        VALUES (:id::uuid, :name, :cat, :price, :cost, :stock, :shelf, :weight)
    """), {
        "id": pid, "name": p.name, "cat": p.category,
        "price": p.price, "cost": p.cost,
        "stock": p.stock_quantity, "shelf": p.shelf_life_days,
        "weight": p.weight_kg,
    })
    await db.commit()
    return {"id": pid, **p.model_dump()}


@router.get("/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text(
        "SELECT DISTINCT category FROM products WHERE is_active = TRUE ORDER BY category"
    ))
    return [row[0] for row in r.fetchall()]
