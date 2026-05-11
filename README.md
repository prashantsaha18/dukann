# 🏪 DukanAI — Smart Store Optimizer

ML-powered retail placement intelligence. **FP-Growth** finds which products are bought together; a **multi-factor scorer** recommends the best zone for every product.

---

## 📁 Project Structure

```
dukan-ai/               ← repo root = Next.js (Vercel auto-detects)
├── package.json        ← Next.js dependencies
├── vercel.json         ← Vercel config (framework: nextjs)
├── next.config.js
├── app/                ← Next.js App Router pages
│   ├── page.js         ← Dashboard
│   ├── products/       ← Inventory table
│   ├── sales/          ← POS Terminal
│   └── store-layout/   ← Heatmap floor plan
├── components/         ← Sidebar, Toast
├── lib/api.js          ← API client
├── schema.sql          ← Run in Neon SQL Editor first
└── backend/            ← Python FastAPI (Railway)
    ├── main.py
    ├── database.py
    ├── train_model.py  ← 5,000 dataset + ML training ⭐
    ├── requirements.txt
    ├── railway.toml
    ├── ml/
    │   ├── basket_analysis.py     ← FP-Growth
    │   └── placement_optimizer.py ← Scoring model
    └── routers/
        ├── products.py
        ├── transactions.py
        ├── zones.py
        ├── recommendations.py  ← POST /api/recommendations/run
        └── analytics.py
```

---

## 🚀 Deploy in 5 Steps

### Step 1 — Neon Database
1. Go to [neon.tech](https://neon.tech) → SQL Editor
2. Paste all of `schema.sql` → Run
3. Copy your connection string

---

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "🚀 DukanAI initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dukan-ai.git
git push -u origin main
```

---

### Step 3 — Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `dukan-ai` GitHub repo
3. **Root Directory** → leave as `/` (the default — don't change)
4. Vercel will auto-detect **Next.js** from `package.json` at root
5. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_API_URL = https://your-backend.railway.app
   ```
   *(Fill in after Railway deploy — you can update later)*
6. Click **Deploy** ✅

Every `git push` to `main` will auto-redeploy.

---

### Step 4 — Deploy Backend on Railway
1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `dukan-ai`
3. Set **Root Directory** → `backend`
4. In the **Variables** tab, add:
   ```
   DATABASE_URL = postgresql://neondb_owner:PASS@ep-xxx.neon.tech/neondb?sslmode=require
   ```
5. Railway reads `railway.toml` and starts with `uvicorn main:app`
6. Your API URL: `https://dukan-ai-production.up.railway.app`

Now go back to Vercel and update `NEXT_PUBLIC_API_URL` with this Railway URL.

---

### Step 5 — Train ML Model with 5,000 Transactions
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt

# Set env vars
cp .env.example .env
# Edit .env:
#   DATABASE_URL = your Neon connection string
#   API_URL      = https://your-backend.railway.app   (or http://localhost:8000 for local)

# Run training pipeline
python train_model.py
```

**What this does:**
- Seeds 50 products across 10 categories
- Seeds 12 store zones with visibility scores
- Generates **5,000 synthetic transactions** with realistic basket patterns
  (bread+butter+milk bought together, Lays+Coke, chai+biscuits, etc.)
- Runs **FP-Growth** to extract association rules
- Runs **placement scorer** — scores every product × zone combination
- Saves all recommendations to DB

Sample output:
```
✓ 50 products ready
✓ 12 zones ready
✓ 5,000 transactions seeded
✓ Transactions analyzed : 5,000
✓ Association rules     : 84
✓ Recommendations       : 48
✓ Top patterns:
    ['Britannia Bread'] → ['Amul Butter 500g']  lift=3.82
    ['Lays Classic']    → ['Coca Cola 600ml']   lift=3.41
    ['Colgate 150g']    → ['Dettol Soap 75g']   lift=3.19
```

---

## 🧠 ML Explained

### FP-Growth Market Basket Analysis
Finds items frequently bought together from transaction history.
- **Support** = % of transactions containing the pair
- **Confidence** = P(buy B | bought A)
- **Lift > 2** = strong co-purchase signal → place these zones adjacent

### Placement Optimizer Scoring (0–100)

| Factor | Weight | Logic |
|--------|--------|-------|
| Sales Velocity | 40% | Fast sellers → high-visibility zones |
| Profit Margin  | 25% | High-margin items → eye-level prime spots |
| Basket Affinity| 20% | Co-purchased products placed near zone neighbors |
| Shelf Life     | 10% | Perishables → most visible zones |
| Category Fit   |  5% | Dairy→Cold, Chocolates→Checkout, Staples→Bulk |

---

## 💻 Local Development

```bash
# Frontend (in repo root)
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev          # → http://localhost:3000

# Backend (in /backend)
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill DATABASE_URL
uvicorn main:app --reload   # → http://localhost:8000
# API docs at http://localhost:8000/docs
```
