from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
load_dotenv()

from database import engine, Base
from routers import products, transactions, recommendations, zones, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(title="DukanAI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router,        prefix="/api/products",        tags=["Products"])
app.include_router(transactions.router,    prefix="/api/transactions",    tags=["Transactions"])
app.include_router(zones.router,           prefix="/api/zones",           tags=["Zones"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["ML"])
app.include_router(analytics.router,       prefix="/api/analytics",       tags=["Analytics"])

@app.get("/")
def root():
    return {"status": "ok", "app": "DukanAI API v1.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
