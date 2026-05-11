from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db

router = APIRouter()

@router.get("/")
async def get_zones(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT
            sz.id::text, sz.name, sz.zone_type, sz.visibility_score,
            sz.position_x, sz.position_y, sz.capacity, sz.description,
            COUNT(pp.id) AS product_count,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'id',       p.id::text,
                        'name',     p.name,
                        'category', p.category,
                        'price',    CAST(p.price AS FLOAT)
                    )
                ) FILTER (WHERE p.id IS NOT NULL),
                '[]'
            ) AS products
        FROM store_zones sz
        LEFT JOIN product_placements pp ON sz.id = pp.zone_id AND pp.is_current = TRUE
        LEFT JOIN products p            ON pp.product_id = p.id
        GROUP BY sz.id, sz.name, sz.zone_type, sz.visibility_score,
                 sz.position_x, sz.position_y, sz.capacity, sz.description
        ORDER BY sz.position_y, sz.position_x
    """))
    rows = r.fetchall()
    return [
        {
            "id": row[0], "name": row[1], "type": row[2],
            "visibility_score": row[3], "x": row[4], "y": row[5],
            "capacity": row[6], "description": row[7],
            "product_count": row[8], "products": row[9],
        }
        for row in rows
    ]
