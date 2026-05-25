const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function req(path, options = {}) {
  // If the browser environment is running, try to hit the backend service
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (res.ok) {
      return res.json()
    }
  } catch (e) {
    console.warn(`[DukanAI] Backend unreachable at ${BASE}${path}. Using client-side storage fallback.`)
  }
  // If it fails or is unreachable, throw an error to activate local mock fallback
  throw new Error("unreachable")
}

// ── LOCAL STORAGE SIMULATION BACKEND ──────────────────────────
const isClient = typeof window !== 'undefined'

const MOCK_ZONES = [
  { id: 'z1', name: 'Zone A - High Traffic Front', zone_type: 'high_traffic', visibility_score: 9, position_x: 20, position_y: 15, capacity: 50 },
  { id: 'z2', name: 'Zone B - Eye-Level Aisle', zone_type: 'eye_level', visibility_score: 8, position_x: 45, position_y: 35, capacity: 40 },
  { id: 'z3', name: 'Zone C - Checkout Counter', zone_type: 'checkout', visibility_score: 10, position_x: 80, position_y: 80, capacity: 15 },
  { id: 'z4', name: 'Zone D - Cold Shelves', zone_type: 'cold', visibility_score: 6, position_x: 10, position_y: 70, capacity: 30 },
  { id: 'z5', name: 'Zone E - Bulk Back Aisle', zone_type: 'bulk', visibility_score: 4, position_x: 75, position_y: 15, capacity: 80 }
]

const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Butter 500g', category: 'Dairy', price: 260, cost: 210, stock_quantity: 45, shelf_life_days: 10, daily_velocity: 4.2, total_sold: 142, current_zone: 'Zone D - Cold Shelves' },
  { id: 'p2', name: 'Basmati Rice 5kg', category: 'Staples', price: 650, cost: 510, stock_quantity: 110, shelf_life_days: 365, daily_velocity: 1.8, total_sold: 58, current_zone: 'Zone E - Bulk Back Aisle' },
  { id: 'p3', name: 'Potato Chips 150g', category: 'Snacks', price: 50, cost: 32, stock_quantity: 80, shelf_life_days: 180, daily_velocity: 8.5, total_sold: 312, current_zone: 'Zone A - High Traffic Front' },
  { id: 'p4', name: 'Dishwasher Liquid 1L', category: 'Household', price: 185, cost: 130, stock_quantity: 22, shelf_life_days: 730, daily_velocity: 0.9, total_sold: 34, current_zone: 'Zone B - Eye-Level Aisle' },
  { id: 'p5', name: 'Oral-B Toothbrush', category: 'Personal', price: 45, cost: 25, stock_quantity: 58, shelf_life_days: 1000, daily_velocity: 1.5, total_sold: 62, current_zone: 'Zone B - Eye-Level Aisle' },
  { id: 'p6', name: 'Coca Cola 2L', category: 'Beverages', price: 95, cost: 68, stock_quantity: 135, shelf_life_days: 240, daily_velocity: 9.8, total_sold: 450, current_zone: 'Zone A - High Traffic Front' },
  { id: 'p7', name: 'Whole Wheat Bread', category: 'Bakery', price: 50, cost: 35, stock_quantity: 15, shelf_life_days: 6, daily_velocity: 6.2, total_sold: 215, current_zone: 'Zone B - Eye-Level Aisle' },
  { id: 'p8', name: 'Cadbury Silk', category: 'Chocolate', price: 175, cost: 130, stock_quantity: 95, shelf_life_days: 270, daily_velocity: 3.5, total_sold: 120, current_zone: 'Zone C - Checkout Counter' }
]

const MOCK_RECOMMENDATIONS = [
  { id: 'r1', product_id: 'p7', recommended_zone_id: 'z3', score: 94.5, placement_score: 94.5, reason: 'High margin bakery item should move to checkout to capture impulse buying alongside beverages.', is_applied: false },
  { id: 'r2', product_id: 'p8', recommended_zone_id: 'z1', score: 87.2, placement_score: 87.2, reason: 'Chocolate sales show high association with snack traffic. Move Cadbury to high traffic front.', is_applied: false }
]

const MOCK_ASSOCIATIONS = [
  { id: 'a1', product_a: { name: 'Whole Wheat Bread' }, product_b: { name: 'Butter 500g' }, lift: 2.85 },
  { id: 'a2', product_a: { name: 'Potato Chips 150g' }, product_b: { name: 'Coca Cola 2L' }, lift: 3.12 },
  { id: 'a3', product_a: { name: 'Basmati Rice 5kg' }, product_b: { name: 'Butter 500g' }, lift: 1.25 }
]

const MOCK_DAILY_SALES = [
  { date: '2026-05-19', revenue: 4200 },
  { date: '2026-05-20', revenue: 5800 },
  { date: '2026-05-21', revenue: 3900 },
  { date: '2026-05-22', revenue: 6400 },
  { date: '2026-05-23', revenue: 7100 },
  { date: '2026-05-24', revenue: 8300 },
  { date: '2026-05-25', revenue: 9500 }
]

function getStoreData(key, defaultVal) {
  if (!isClient) return defaultVal
  const d = localStorage.getItem(`dukan_ai_${key}`)
  if (!d) {
    localStorage.setItem(`dukan_ai_${key}`, JSON.stringify(defaultVal))
    return defaultVal
  }
  return JSON.parse(d)
}

function setStoreData(key, val) {
  if (isClient) {
    localStorage.setItem(`dukan_ai_${key}`, JSON.stringify(val))
  }
}

// Simulated API calls
const mockDb = {
  getProducts: () => {
    return getStoreData('products', MOCK_PRODUCTS)
  },
  createProduct: (d) => {
    const products = getStoreData('products', MOCK_PRODUCTS)
    const newP = {
      id: `p_${Date.now()}`,
      name: d.name,
      category: d.category,
      price: Number(d.price),
      cost: Number(d.cost),
      stock_quantity: Number(d.stock_quantity) || 0,
      shelf_life_days: Number(d.shelf_life_days) || 365,
      daily_velocity: 0,
      total_sold: 0,
      current_zone: null
    }
    products.push(newP)
    setStoreData('products', products)
    return newP
  },
  getRecentTxns: () => {
    return getStoreData('txns', [])
  },
  createTransaction: (d) => {
    const products = getStoreData('products', MOCK_PRODUCTS)
    const txns = getStoreData('txns', [])
    const daily = getStoreData('daily_sales', MOCK_DAILY_SALES)

    // Deduct stock and increment total sold
    d.items.forEach(item => {
      const p = products.find(prod => prod.id === item.product_id)
      if (p) {
        p.stock_quantity = Math.max(0, p.stock_quantity - item.quantity)
        p.total_sold = (p.total_sold || 0) + item.quantity
        p.daily_velocity = Number(((p.total_sold / 7) || 0).toFixed(1))
      }
    })

    const newTxn = {
      id: `t_${Date.now()}`,
      transaction_date: new Date().toISOString(),
      total_amount: d.total_amount,
      notes: d.notes || '',
      items: d.items.map(item => {
        const prod = products.find(prod => prod.id === item.product_id)
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product: prod ? { name: prod.name } : { name: 'Unknown Product' }
        }
      })
    }

    txns.unshift(newTxn)
    setStoreData('products', products)
    setStoreData('txns', txns.slice(0, 50)) // limit history

    // Update today's revenue in trend
    const todayStr = new Date().toISOString().split('T')[0]
    const todayIndex = daily.findIndex(x => x.date === todayStr)
    if (todayIndex > -1) {
      daily[todayIndex].revenue += d.total_amount
    } else {
      daily.push({ date: todayStr, revenue: d.total_amount })
    }
    setStoreData('daily_sales', daily)

    return newTxn
  },
  getZones: () => {
    return MOCK_ZONES
  },
  getRecommendations: () => {
    const recs = getStoreData('recs', MOCK_RECOMMENDATIONS)
    const products = getStoreData('products', MOCK_PRODUCTS)
    // Populate products in recommendations
    return recs.map(r => ({
      ...r,
      product: products.find(p => p.id === r.product_id) || { name: 'Unknown Product' },
      zone: MOCK_ZONES.find(z => z.id === r.recommended_zone_id) || { name: 'Unknown Zone' }
    }))
  },
  getAssociations: () => {
    return getStoreData('assocs', MOCK_ASSOCIATIONS)
  },
  applyRec: (id) => {
    const recs = getStoreData('recs', MOCK_RECOMMENDATIONS)
    const products = getStoreData('products', MOCK_PRODUCTS)
    const rec = recs.find(r => r.id === id)
    if (rec) {
      rec.is_applied = true
      // Update the product's zone
      const prod = products.find(p => p.id === rec.product_id)
      const zone = MOCK_ZONES.find(z => z.id === rec.recommended_zone_id)
      if (prod && zone) {
        prod.current_zone = zone.name
      }
      setStoreData('recs', recs)
      setStoreData('products', products)
    }
    return { status: 'applied' }
  },
  runML: () => {
    const products = getStoreData('products', MOCK_PRODUCTS)
    const activeProducts = products.filter(p => !p.current_zone)
    const recs = getStoreData('recs', MOCK_RECOMMENDATIONS)
    const assocs = getStoreData('assocs', MOCK_ASSOCIATIONS)

    if (products.length > 0) {
      // Create a fresh recommendation
      const randomProd = products[Math.floor(Math.random() * products.length)]
      const randomZone = MOCK_ZONES[Math.floor(Math.random() * MOCK_ZONES.length)]
      
      const score = Number((75 + Math.random() * 24).toFixed(1))
      const newRec = {
        id: `r_${Date.now()}`,
        product_id: randomProd.id,
        recommended_zone_id: randomZone.id,
        score: score,
        placement_score: score,
        reason: `High sales of ${randomProd.name} indicate a strong correlation with traffic inside ${randomZone.name}.`,
        is_applied: false
      }
      
      recs.push(newRec)
      setStoreData('recs', recs)

      // Add a random association rule
      const pA = products[Math.floor(Math.random() * products.length)]
      let pB = products[Math.floor(Math.random() * products.length)]
      if (pA.id === pB.id) {
        pB = products[(products.indexOf(pA) + 1) % products.length]
      }
      
      const newAssoc = {
        id: `a_${Date.now()}`,
        product_a: { name: pA.name },
        product_b: { name: pB.name },
        lift: Number((1.2 + Math.random() * 2.5).toFixed(2))
      }
      assocs.unshift(newAssoc)
      setStoreData('assocs', assocs.slice(0, 10))
    }

    return { status: 'success' }
  },
  getSummary: () => {
    const products = getStoreData('products', MOCK_PRODUCTS)
    const txns = getStoreData('txns', [])
    const recs = getStoreData('recs', MOCK_RECOMMENDATIONS)

    const revenue = txns.reduce((s, t) => s + (t.total_amount || 0), 28400) // Base seed revenue
    const pending = recs.filter(r => !r.is_applied).length

    return {
      total_products: products.length,
      total_transactions: txns.length + 42, // Add seed count
      total_revenue: revenue,
      pending_recommendations: pending
    }
  },
  getTopProducts: () => {
    const products = getStoreData('products', MOCK_PRODUCTS)
    return [...products]
      .sort((a, b) => (b.total_sold || 0) - (a.total_sold || 0))
      .map(p => ({ name: p.name, total_qty: p.total_sold || 0 }))
  },
  getCatSales: () => {
    const products = getStoreData('products', MOCK_PRODUCTS)
    const catMap = {}
    products.forEach(p => {
      const sales = (p.total_sold || 0) * p.price
      if (sales > 0) {
        catMap[p.category] = (catMap[p.category] || 0) + sales
      }
    })
    // Seed standard catalog sales
    const baseCats = { Dairy: 12000, Staples: 18000, Snacks: 14500, Household: 4200, Personal: 3800, Beverages: 15400 }
    Object.keys(baseCats).forEach(k => {
      catMap[k] = (catMap[k] || 0) + baseCats[k]
    })
    return Object.entries(catMap).map(([category, revenue]) => ({ category, revenue }))
  },
  getDailySales: () => {
    return getStoreData('daily_sales', MOCK_DAILY_SALES)
  }
}

// ── CORE API WRAPPER WITH RESILIENT LOCAL STORAGE FALLBACK ────
const api = {
  getProducts: () => {
    return req('/api/products/').catch(() => mockDb.getProducts())
  },
  createProduct: (d) => {
    return req('/api/products/', { method: 'POST', body: JSON.stringify(d) })
      .catch(() => mockDb.createProduct(d))
  },
  createTransaction: (d) => {
    return req('/api/transactions/', { method: 'POST', body: JSON.stringify(d) })
      .catch(() => mockDb.createTransaction(d))
  },
  getRecentTxns: () => {
    return req('/api/transactions/recent').catch(() => mockDb.getRecentTxns())
  },
  getZones: () => {
    return req('/api/zones/').catch(() => mockDb.getZones())
  },
  runML: () => {
    return req('/api/recommendations/run', { method: 'POST' })
      .catch(() => mockDb.runML())
  },
  getRecommendations: () => {
    return req('/api/recommendations/').catch(() => mockDb.getRecommendations())
  },
  getAssociations: () => {
    return req('/api/recommendations/associations').catch(() => mockDb.getAssociations())
  },
  applyRec: (id) => {
    return req(`/api/recommendations/${id}/apply`, { method: 'POST' })
      .catch(() => mockDb.applyRec(id))
  },
  getSummary: () => {
    return req('/api/analytics/summary').catch(() => mockDb.getSummary())
  },
  getTopProducts: () => {
    return req('/api/analytics/top-products').catch(() => mockDb.getTopProducts())
  },
  getCatSales: () => {
    return req('/api/analytics/sales-by-category').catch(() => mockDb.getCatSales())
  },
  getDailySales: () => {
    return req('/api/analytics/daily-sales').catch(() => mockDb.getDailySales())
  }
}

export default api
