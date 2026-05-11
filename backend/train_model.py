"""
╔══════════════════════════════════════════════════════════════════════╗
║  DukanAI — ML Training Pipeline                                      ║
║  Generates 5,000 realistic retail transactions                       ║
║  then runs the full FP-Growth + placement scoring pipeline           ║
║                                                                      ║
║  Usage:  python train_model.py                                       ║
╚══════════════════════════════════════════════════════════════════════╝
"""

import os, uuid, random, asyncio, re
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()

# ──────────────────────────────────────────────────────────────────────
# PRODUCT CATALOG  (50 realistic kirana / supermarket SKUs)
# name, category, price, cost, initial_stock, shelf_life_days
# ──────────────────────────────────────────────────────────────────────
PRODUCTS = [
    # Dairy
    ("Amul Butter 500g",           "Dairy",       55,   42,  60,  30),
    ("Amul Doodh 1L",              "Dairy",       28,   22, 120,   5),
    ("Mother Dairy Paneer 200g",   "Dairy",       90,   70,  40,  10),
    ("Nestle Yogurt 400g",         "Dairy",       45,   34,  80,  14),
    ("Amul Cheese Slices 200g",    "Dairy",      120,   92,  50,  30),
    # Staples
    ("Tata Salt 1kg",              "Staples",     20,   16, 200, 365),
    ("Aashirvaad Atta 5kg",        "Staples",    250,  210,  80, 365),
    ("Fortune Sunflower Oil 1L",   "Staples",    135,  118, 100, 365),
    ("Toor Dal 1kg",               "Staples",    120,  100,  90, 365),
    ("India Gate Basmati 1kg",     "Staples",     95,   78,  70, 365),
    ("Patanjali Mustard Oil 1L",   "Staples",    110,   92,  60, 365),
    ("MDH Garam Masala 100g",      "Staples",     65,   48, 100, 365),
    # Snacks
    ("Maggi Noodles 70g",          "Snacks",      14,   10, 200, 180),
    ("Lays Classic 26g",           "Snacks",      20,   15, 250,  90),
    ("Kurkure Masala 50g",         "Snacks",      20,   15, 200,  90),
    ("Haldiram Bhujia 200g",       "Snacks",      60,   46, 120, 180),
    ("Parle-G 800g",               "Snacks",      50,   38, 100, 180),
    ("Britannia Good Day 120g",    "Snacks",      30,   22, 150, 180),
    ("Uncle Chips 45g",            "Snacks",      20,   15, 180,  90),
    # Household
    ("Surf Excel 1kg",             "Household",  195,  160,  60, 730),
    ("Vim Dishwash Bar 300g",      "Household",   30,   22, 100, 730),
    ("Harpic Toilet Cleaner 1L",   "Household",  130,  100,  40, 730),
    ("Ariel 500g",                 "Household",  150,  120,  50, 730),
    ("Domex Floor Cleaner 500ml",  "Household",   80,   62,  60, 730),
    # Personal
    ("Colgate 150g",               "Personal",    65,   50, 100, 730),
    ("Dettol Soap 75g",            "Personal",    40,   30, 120, 730),
    ("Dove Shampoo 180ml",         "Personal",   175,  138,  60, 730),
    ("Ponds Cream 50ml",           "Personal",    95,   72,  80, 730),
    ("Gillette Mach3 2-pack",      "Personal",   160,  128,  40, 730),
    ("Whisper Ultra 8-pack",       "Personal",    70,   54,  80, 365),
    # Beverages
    ("Coca Cola 600ml",            "Beverages",   40,   32, 150, 180),
    ("Pepsi 600ml",                "Beverages",   40,   32, 130, 180),
    ("Frooti 200ml",               "Beverages",   20,   15, 200, 180),
    ("Lipton Yellow Label 250g",   "Beverages",  130,  100,  90, 730),
    ("Red Bull 250ml",             "Beverages",  125,   98,  60, 365),
    ("Minute Maid Orange 400ml",   "Beverages",   35,   26, 120,  90),
    ("Nescafe Classic 50g",        "Beverages",  180,  140,  70, 365),
    # Bakery
    ("Britannia Bread",            "Bakery",      40,   30,  60,   5),
    ("Modern Sliced Bread",        "Bakery",      42,   32,  50,   5),
    ("Monginis Cake Slice",        "Bakery",      25,   18,  80,   4),
    # Chocolate
    ("Dairy Milk 40g",             "Chocolate",   20,   14, 250, 180),
    ("Kit Kat 2F",                 "Chocolate",   20,   14, 200, 180),
    ("5 Star 40g",                 "Chocolate",   20,   14, 200, 180),
    ("Snickers 50g",               "Chocolate",   45,   34, 120, 180),
    ("Ferrero Rocher 3-pack",      "Chocolate",  150,  118,  60, 180),
    # Frozen
    ("Amul Ice Cream 500ml",       "Frozen",     130,  100,  40,  90),
    ("McCain Fries 420g",          "Frozen",     130,  100,  30,  90),
    # Organic
    ("Organic India Tulsi Tea",    "Organic",    180,  140,  40, 730),
    ("Patanjali Amla Juice 1L",    "Organic",    120,   92,  50, 180),
    ("24 Mantra Organic Atta 1kg", "Organic",     95,   75,  40, 365),
]

# ──────────────────────────────────────────────────────────────────────
# STORE ZONES
# ──────────────────────────────────────────────────────────────────────
ZONES = [
    # name,               type,           vis, x, y, cap, description
    ("Entry Zone",        "high_traffic",  9, 0, 0,  8,  "First thing customers see on entry"),
    ("Eye Level Left",    "eye_level",     8, 1, 1, 12,  "Prime shelf — left wall"),
    ("Eye Level Right",   "eye_level",     8, 2, 1, 12,  "Prime shelf — right wall"),
    ("Center Aisle",      "high_traffic",  7, 1, 2, 15,  "Main shopping aisle"),
    ("Checkout Counter",  "checkout",     10, 3, 0,  5,  "Impulse buy zone by billing"),
    ("Back Wall",         "bulk",          4, 0, 3, 20,  "Staples and bulk items"),
    ("Cold Section",      "cold",          6, 3, 2,  8,  "Refrigerated products"),
    ("Top Shelf Left",    "eye_level",     3, 1, 0, 10,  "Less visible — harder to reach"),
    ("Bottom Shelf",      "bulk",          2, 2, 3, 10,  "Heavy / bulk items"),
    ("Endcap A",          "high_traffic",  8, 0, 1,  6,  "Aisle endcap — high traffic"),
    ("Endcap B",          "high_traffic",  8, 3, 1,  6,  "Aisle endcap — right side"),
    ("Organic Corner",    "eye_level",     6, 3, 3,  8,  "Organic and premium section"),
]

# ──────────────────────────────────────────────────────────────────────
# BASKET AFFINITY GROUPS
# Products that customers realistically buy together
# ──────────────────────────────────────────────────────────────────────
AFFINITY_GROUPS = [
    # Morning chai / coffee
    (["Lipton Yellow Label 250g", "Amul Doodh 1L", "Parle-G 800g"],             0.72),
    (["Nescafe Classic 50g",      "Amul Doodh 1L", "Britannia Good Day 120g"],  0.60),
    # Breakfast basket
    (["Britannia Bread",          "Amul Butter 500g",       "Amul Doodh 1L"],   0.78),
    (["Modern Sliced Bread",      "Amul Butter 500g"],                           0.65),
    (["Britannia Bread",          "Amul Cheese Slices 200g"],                    0.55),
    # Cooking essentials
    (["Fortune Sunflower Oil 1L", "Toor Dal 1kg", "Tata Salt 1kg"],             0.62),
    (["MDH Garam Masala 100g",    "Fortune Sunflower Oil 1L"],                   0.58),
    (["India Gate Basmati 1kg",   "Toor Dal 1kg", "MDH Garam Masala 100g"],     0.55),
    (["Patanjali Mustard Oil 1L", "Tata Salt 1kg"],                              0.52),
    # Snack + drink combos (high-lift)
    (["Lays Classic 26g",         "Coca Cola 600ml"],                            0.74),
    (["Kurkure Masala 50g",       "Pepsi 600ml"],                               0.68),
    (["Uncle Chips 45g",          "Frooti 200ml"],                              0.62),
    (["Haldiram Bhujia 200g",     "Lipton Yellow Label 250g"],                  0.52),
    # Instant food
    (["Maggi Noodles 70g",        "Coca Cola 600ml",  "Lays Classic 26g"],      0.68),
    (["Maggi Noodles 70g",        "Kurkure Masala 50g"],                        0.55),
    # Chocolate impulse
    (["Dairy Milk 40g",           "Kit Kat 2F"],                                0.46),
    (["Dairy Milk 40g",           "Coca Cola 600ml"],                           0.52),
    (["Snickers 50g",             "Red Bull 250ml"],                            0.48),
    # Household cleaning bundle
    (["Surf Excel 1kg",           "Vim Dishwash Bar 300g"],                     0.72),
    (["Harpic Toilet Cleaner 1L", "Domex Floor Cleaner 500ml"],                0.65),
    (["Ariel 500g",               "Vim Dishwash Bar 300g"],                     0.60),
    # Personal care
    (["Colgate 150g",             "Dettol Soap 75g"],                           0.73),
    (["Dove Shampoo 180ml",       "Ponds Cream 50ml"],                          0.58),
    (["Gillette Mach3 2-pack",    "Dettol Soap 75g"],                           0.50),
    # Dairy combo
    (["Amul Butter 500g",         "Amul Doodh 1L"],                             0.76),
    (["Mother Dairy Paneer 200g", "Fortune Sunflower Oil 1L", "MDH Garam Masala 100g"], 0.62),
    (["Nestle Yogurt 400g",       "Amul Doodh 1L"],                             0.55),
    # Organic conscious shopper
    (["Organic India Tulsi Tea",  "Patanjali Amla Juice 1L", "24 Mantra Organic Atta 1kg"], 0.68),
    (["Patanjali Mustard Oil 1L", "24 Mantra Organic Atta 1kg"],               0.60),
    # Frozen + extras
    (["Amul Ice Cream 500ml",     "Dairy Milk 40g"],                            0.55),
    (["McCain Fries 420g",        "Coca Cola 600ml"],                           0.68),
    # Premium
    (["Ferrero Rocher 3-pack",    "Red Bull 250ml"],                            0.45),
    (["Whisper Ultra 8-pack",     "Ponds Cream 50ml"],                          0.48),
]

MORNING_BIAS   = ["Amul Doodh 1L","Lipton Yellow Label 250g","Nescafe Classic 50g","Britannia Bread","Amul Butter 500g","Parle-G 800g"]
EVENING_BIAS   = ["Coca Cola 600ml","Pepsi 600ml","Lays Classic 26g","Kurkure Masala 50g","Dairy Milk 40g","Kit Kat 2F"]
WEEKEND_EXTRAS = ["Ferrero Rocher 3-pack","Snickers 50g","Red Bull 250ml","Amul Ice Cream 500ml","McCain Fries 420g"]


# ──────────────────────────────────────────────────────────────────────
# DATABASE HELPERS
# ──────────────────────────────────────────────────────────────────────
import asyncpg

async def get_conn():
    raw = os.getenv("DATABASE_URL", "")
    # asyncpg wants postgresql://, not postgres://
    raw = raw.replace("postgres://", "postgresql://", 1)
    # Strip existing query params; add sslmode=require
    clean = re.sub(r'\?.*', '', raw)
    return await asyncpg.connect(clean + "?sslmode=require")


async def seed_products(conn) -> dict:
    print("  Seeding products …")
    name_to_id = {}
    for (name, cat, price, cost, stock, shelf) in PRODUCTS:
        pid = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO products (id, name, category, price, cost, stock_quantity, shelf_life_days, is_active)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, TRUE)
            ON CONFLICT DO NOTHING
        """, pid, name, cat, float(price), float(cost), stock, shelf)
        row = await conn.fetchrow("SELECT id::text FROM products WHERE name = $1", name)
        if row:
            name_to_id[name] = row["id"]
    print(f"  ✓ {len(name_to_id)} products ready")
    return name_to_id


async def seed_zones(conn) -> dict:
    print("  Seeding store zones …")
    name_to_id = {}
    for (name, ztype, vis, x, y, cap, desc) in ZONES:
        zid = str(uuid.uuid4())
        await conn.execute("""
            INSERT INTO store_zones (id, name, zone_type, visibility_score, position_x, position_y, capacity, description)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT DO NOTHING
        """, zid, name, ztype, vis, x, y, cap, desc)
        row = await conn.fetchrow("SELECT id::text FROM store_zones WHERE name = $1", name)
        if row:
            name_to_id[name] = row["id"]
    print(f"  ✓ {len(name_to_id)} zones ready")
    return name_to_id


# ──────────────────────────────────────────────────────────────────────
# SYNTHETIC BASKET GENERATOR
# ──────────────────────────────────────────────────────────────────────

def generate_basket(name_to_id: dict, txn_dt: datetime) -> list:
    """Return list of (product_id, quantity) for a single synthetic transaction."""
    all_names = list(name_to_id.keys())
    hour       = txn_dt.hour
    is_weekend = txn_dt.weekday() >= 5
    chosen     = set()

    # 1. Pull from an affinity group (70% probability)
    if random.random() < 0.70:
        group, prob = random.choice(AFFINITY_GROUPS)
        valid = [n for n in group if n in name_to_id]
        if valid:
            anchor = random.choice(valid)
            chosen.add(anchor)
            for n in valid:
                if n != anchor and random.random() < prob:
                    chosen.add(n)

    # 2. Time-of-day bias
    if 6 <= hour <= 10:
        for n in MORNING_BIAS:
            if n in name_to_id and random.random() < 0.35:
                chosen.add(n)
    elif 16 <= hour <= 22:
        for n in EVENING_BIAS:
            if n in name_to_id and random.random() < 0.30:
                chosen.add(n)

    # 3. Weekend extras
    if is_weekend:
        for n in WEEKEND_EXTRAS:
            if n in name_to_id and random.random() < 0.20:
                chosen.add(n)

    # 4. Impulse add (40% chance of 1–3 random items)
    for _ in range(random.randint(1, 3) if random.random() < 0.40 else 0):
        chosen.add(random.choice(all_names))

    if not chosen:
        chosen.add(random.choice(all_names))

    return [
        (name_to_id[n], random.choices([1, 2, 3, 4], weights=[60, 25, 10, 5])[0])
        for n in chosen
        if n in name_to_id
    ]


async def seed_transactions(conn, name_to_id: dict, count: int = 5000):
    print(f"  Generating {count:,} transactions …")
    rows = await conn.fetch("SELECT id::text, price FROM products")
    prices = {r["id"]: float(r["price"]) for r in rows}

    start = datetime.now() - timedelta(days=90)
    HOUR_WEIGHTS = [1,1,1,1,1,1,2,4,7,9,9,8,8,9,10,9,8,8,9,10,9,7,5,3]

    txn_batch, item_batch = [], []
    for i in range(count):
        day_offset = random.randint(0, 89)
        hour       = random.choices(range(24), weights=HOUR_WEIGHTS)[0]
        minute     = random.randint(0, 59)
        txn_dt     = start + timedelta(days=day_offset, hours=hour, minutes=minute)

        items = generate_basket(name_to_id, txn_dt)
        if not items:
            continue

        total  = sum(prices.get(pid, 0) * qty for pid, qty in items)
        txn_id = str(uuid.uuid4())
        txn_batch.append((txn_id, txn_dt, float(total)))
        for pid, qty in items:
            item_batch.append((str(uuid.uuid4()), txn_id, pid, qty, prices.get(pid, 0.0)))

        if len(txn_batch) >= 500:
            await conn.executemany(
                "INSERT INTO transactions (id, transaction_date, total_amount) VALUES ($1::uuid, $2, $3) ON CONFLICT DO NOTHING",
                txn_batch)
            await conn.executemany(
                "INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5) ON CONFLICT DO NOTHING",
                item_batch)
            print(f"    … {i+1:,}/{count:,} inserted")
            txn_batch, item_batch = [], []

    if txn_batch:
        await conn.executemany(
            "INSERT INTO transactions (id, transaction_date, total_amount) VALUES ($1::uuid, $2, $3) ON CONFLICT DO NOTHING",
            txn_batch)
        await conn.executemany(
            "INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5) ON CONFLICT DO NOTHING",
            item_batch)

    print(f"  ✓ {count:,} transactions seeded")


# ──────────────────────────────────────────────────────────────────────
# TRIGGER ML VIA API
# ──────────────────────────────────────────────────────────────────────
import httpx

async def trigger_ml():
    api_url = os.getenv("API_URL", "http://localhost:8000")
    print(f"  Calling ML pipeline at {api_url} …")
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            r = await client.post(f"{api_url}/api/recommendations/run")
            if r.status_code == 200:
                d = r.json()
                print(f"  ✓ Transactions analyzed : {d.get('transactions_analyzed', '?'):,}")
                print(f"  ✓ Association rules     : {d.get('association_rules_found', '?')}")
                print(f"  ✓ Recommendations       : {d.get('recommendations_generated', '?')}")
                top = d.get("top_associations", [])
                if top:
                    print("  ✓ Top patterns found:")
                    for a in top[:5]:
                        print(f"      {a['if_buy']} → {a['also_buy']}"
                              f"  lift={a['lift']:.2f}  conf={a['confidence']:.0%}")
                return d
            else:
                print(f"  ✗ API returned {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"  ✗ Could not reach API: {e}")
        print("    → Start backend first: uvicorn main:app --reload")
        print("    → Then re-run: python train_model.py")
    return None


# ──────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────

async def main():
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  DukanAI — ML Training Pipeline                             ║")
    print("║  50 products · 12 zones · 5,000 transactions                ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()

    if not os.getenv("DATABASE_URL"):
        print("❌  DATABASE_URL not set. Copy .env.example → .env and fill it.")
        return

    print("📦  Step 1 — Connecting to Neon PostgreSQL …")
    conn = await get_conn()
    print("    ✓ Connected\n")

    print("📦  Step 2 — Seeding products & zones …")
    name_to_id = await seed_products(conn)
    await seed_zones(conn)
    print()

    print("📊  Step 3 — Generating 5,000 synthetic transactions …")
    print("    (Using realistic basket affinity patterns + time-of-day bias)")
    await seed_transactions(conn, name_to_id, count=5000)
    print()

    await conn.close()

    print("🧠  Step 4 — Training ML model (FP-Growth + Placement Scorer) …")
    result = await trigger_ml()
    print()

    if result:
        print("✅  Training complete!")
        print()
        print("   Next steps:")
        print("   1. Open your frontend → Dashboard")
        print("   2. See basket associations under 'Bought Together'")
        print("   3. Go to Store Map → apply AI placement recommendations")
        print()
    else:
        print("⚠   Data seeded. Start backend then re-run for ML training.")

if __name__ == "__main__":
    asyncio.run(main())
