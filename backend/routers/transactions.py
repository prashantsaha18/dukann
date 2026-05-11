from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
import uuid
from database import get_db

router = APIRouter()

class ItemIn(BaseModel):
    product_id: str
    quantity: int
    unit_price: float

class TxnIn(BaseModel):
    items: List[ItemIn]
    notes: str = ""


@router.post("/")
async def create_transaction(txn: TxnIn, db: AsyncSession = Depends(get_db)):
    tid   = str(uuid.uuid4())
    total = sum(i.quantity * i.unit_price for i in txn.items)

    await db.execute(text("""
        INSERT INTO transactions (id, total_amount, notes)
        VALUES (:id::uuid, :total, :notes)
    """), {"id": tid, "total": total, "notes": txn.notes})

    for item in txn.items:
        await db.execute(text("""
            INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price)
            VALUES (:id::uuid, :tid::uuid, :pid::uuid, :qty, :price)
        """), {
            "id": str(uuid.uuid4()), "tid": tid,
            "pid": item.product_id, "qty": item.quantity, "price": item.unit_price,
        })
        # Decrement stock
        await db.execute(text("""
            UPDATE products
            SET stock_quantity = GREATEST(stock_quantity - :qty, 0)
            WHERE id = :pid::uuid
        """), {"qty": item.quantity, "pid": item.product_id})

    await db.commit()
    return {"id": tid, "total": total, "items_count": len(txn.items)}


@router.get("/recent")
async def recent_transactions(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT t.id::text, t.transaction_date,
               CAST(t.total_amount AS FLOAT),
               COUNT(ti.id) AS item_count
        FROM transactions t
        LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
        GROUP BY t.id, t.transaction_date, t.total_amount
        ORDER BY t.transaction_date DESC
        LIMIT 30
    """))
    rows = r.fetchall()
    return [
        {"id": row[0], "date": row[1].isoformat(), "total": row[2], "item_count": row[3]}
        for row in rows
    ]
