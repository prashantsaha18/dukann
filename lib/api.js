const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

const api = {
  // Products
  getProducts:   ()  => req('/api/products/'),
  createProduct: (d) => req('/api/products/', { method: 'POST', body: JSON.stringify(d) }),

  // Transactions
  createTransaction: (d) => req('/api/transactions/', { method: 'POST', body: JSON.stringify(d) }),
  getRecentTxns:     ()  => req('/api/transactions/recent'),

  // Zones
  getZones: () => req('/api/zones/'),

  // ML
  runML:              ()   => req('/api/recommendations/run', { method: 'POST' }),
  getRecommendations: ()   => req('/api/recommendations/'),
  getAssociations:    ()   => req('/api/recommendations/associations'),
  applyRec:           (id) => req(`/api/recommendations/${id}/apply`, { method: 'POST' }),

  // Analytics
  getSummary:    () => req('/api/analytics/summary'),
  getTopProducts:() => req('/api/analytics/top-products'),
  getCatSales:   () => req('/api/analytics/sales-by-category'),
  getDailySales: () => req('/api/analytics/daily-sales'),
}

export default api
