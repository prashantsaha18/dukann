-- ================================================================
-- DukanAI — Neon PostgreSQL Schema
-- Run this FIRST in Neon SQL Editor before anything else
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  price           DECIMAL(10,2) NOT NULL,
  cost            DECIMAL(10,2) NOT NULL,
  stock_quantity  INTEGER DEFAULT 0,
  shelf_life_days INTEGER DEFAULT 365,
  weight_kg       DECIMAL(8,3) DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Store zones (physical areas)
CREATE TABLE IF NOT EXISTS store_zones (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  zone_type        VARCHAR(50) NOT NULL,  -- high_traffic|eye_level|checkout|cold|bulk
  visibility_score INTEGER DEFAULT 5,     -- 1-10
  position_x       INTEGER NOT NULL,
  position_y       INTEGER NOT NULL,
  capacity         INTEGER DEFAULT 10,
  description      TEXT
);

-- Which product is in which zone
CREATE TABLE IF NOT EXISTS product_placements (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id)    ON DELETE CASCADE,
  zone_id    UUID REFERENCES store_zones(id) ON DELETE CASCADE,
  placed_at  TIMESTAMP DEFAULT NOW(),
  is_current BOOLEAN DEFAULT TRUE,
  UNIQUE(zone_id, product_id)
);

-- Sales transactions
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date TIMESTAMP DEFAULT NOW(),
  total_amount     DECIMAL(10,2) DEFAULT 0,
  customer_id      VARCHAR(100),
  notes            TEXT
);

-- Items in each transaction
CREATE TABLE IF NOT EXISTS transaction_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES products(id)     ON DELETE CASCADE,
  quantity       INTEGER NOT NULL DEFAULT 1,
  unit_price     DECIMAL(10,2) NOT NULL
);

-- ML placement recommendations
CREATE TABLE IF NOT EXISTS placement_recommendations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id          UUID REFERENCES products(id)    ON DELETE CASCADE,
  recommended_zone_id UUID REFERENCES store_zones(id) ON DELETE CASCADE,
  placement_score     DECIMAL(5,2) NOT NULL,
  reason              TEXT,
  generated_at        TIMESTAMP DEFAULT NOW(),
  is_applied          BOOLEAN DEFAULT FALSE
);

-- FP-Growth association rules (bought together)
CREATE TABLE IF NOT EXISTS product_associations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_a     UUID REFERENCES products(id) ON DELETE CASCADE,
  product_b     UUID REFERENCES products(id) ON DELETE CASCADE,
  support       DECIMAL(8,4),
  confidence    DECIMAL(8,4),
  lift          DECIMAL(8,4),
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_a, product_b)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ti_product ON transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_ti_txn     ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_txn_date   ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_pp_zone    ON product_placements(zone_id);
CREATE INDEX IF NOT EXISTS idx_assoc_a    ON product_associations(product_a);

-- Useful view: sales velocity per product
CREATE OR REPLACE VIEW product_sales_velocity AS
SELECT
  p.id, p.name, p.category, p.price, p.cost,
  COALESCE(SUM(ti.quantity), 0) AS total_sold,
  CASE WHEN COUNT(DISTINCT DATE(t.transaction_date)) > 0
       THEN SUM(ti.quantity)::FLOAT / COUNT(DISTINCT DATE(t.transaction_date))
       ELSE 0 END AS daily_velocity,
  COALESCE(SUM(ti.quantity * (p.price - p.cost)), 0) AS total_profit
FROM products p
LEFT JOIN transaction_items ti ON p.id = ti.product_id
LEFT JOIN transactions t ON ti.transaction_id = t.id
WHERE p.is_active = TRUE
GROUP BY p.id, p.name, p.category, p.price, p.cost;
