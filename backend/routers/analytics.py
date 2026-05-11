from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import get_db

router = APIRouter()

@router.get("/summary")
async def summary(db: AsyncSession = Depends(get_db)):
    s = {}
    s["total_products"]          = (await db.execute(text("SELECT COUNT(*) FROM products WHERE is_active=TRUE"))).scalar()
    s["total_transactions"]      = (await db.execute(text("SELECT COUNT(*) FROM transactions"))).scalar()
    s["total_revenue"]           = round((await db.execute(text("SELECT COALESCE(SUM(CAST(total_amount AS FLOAT)),0) FROM transactions"))).scalar(), 2)
    s["pending_recommendations"] = (await db.execute(text("SELECT COUNT(*) FROM placement_recommendations WHERE is_applied=FALSE"))).scalar()
    s["association_rules"]       = (await db.execute(text("SELECT COUNT(*) FROM product_associations"))).scalar()
    return s

@router.get("/top-products")
async def top_products(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT p.name, p.category,
               COALESCE(SUM(ti.quantity),0) as total_qty,
               COALESCE(SUM(ti.quantity*CAST(ti.unit_price AS FLOAT)),0) as revenue,
               COALESCE(SUM(ti.quantity*(CAST(ti.unit_price AS FLOAT)-CAST(p.cost AS FLOAT))),0) as profit
        FROM products p LEFT JOIN transaction_items ti ON p.id=ti.product_id
        WHERE p.is_active=TRUE
        GROUP BY p.id,p.name,p.category ORDER BY total_qty DESC LIMIT 10
    """))
    return [{"name":r[0],"category":r[1],"total_qty":r[2],"revenue":round(r[3],2),"profit":round(r[4],2)}
            for r in r.fetchall()]

@router.get("/sales-by-category")
async def cat_sales(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT p.category,
               COALESCE(SUM(ti.quantity),0) as qty,
               COALESCE(SUM(ti.quantity*CAST(ti.unit_price AS FLOAT)),0) as revenue
        FROM products p LEFT JOIN transaction_items ti ON p.id=ti.product_id
        WHERE p.is_active=TRUE GROUP BY p.category ORDER BY revenue DESC
    """))
    return [{"category":r[0],"total_qty":r[1],"revenue":round(r[2],2)} for r in r.fetchall()]

@router.get("/daily-sales")
async def daily_sales(db: AsyncSession = Depends(get_db)):
    r = await db.execute(text("""
        SELECT DATE(transaction_date) as day,
               COUNT(*) as txn_count,
               SUM(CAST(total_amount AS FLOAT)) as revenue
        FROM transactions GROUP BY DATE(transaction_date)
        ORDER BY day DESC LIMIT 30
    """))
    return [{"date":str(r[0]),"transactions":r[1],"revenue":round(r[2],2)} for r in r.fetchall()]
