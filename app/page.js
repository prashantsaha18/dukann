'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import { toast } from '@/components/Toast'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Package, ShoppingCart, TrendingUp, Brain, ArrowUpRight, Zap, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const PIE_COLORS = ['#F59E0B','#06C8D4','#10D67B','#F43F5E','#A78BFA','#FB923C']

/* Animated counter */
function Counter({ target, prefix = '' }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!target) return
    let cur = 0
    const inc = target / 55
    const t = setInterval(() => {
      cur = Math.min(cur + inc, target)
      setV(cur)
      if (cur >= target) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [target])
  const display = target % 1 === 0 ? Math.round(v).toLocaleString() : v.toFixed(0)
  return <span>{prefix}{display}</span>
}

function ChartTip({ active, payload, label, pre = '₹' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'var(--ink-2)', border:'1px solid var(--border-2)', borderRadius:8, padding:'8px 12px' }}>
      <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize:13, fontWeight:700, color: p.color || 'var(--amber)', fontFamily:'var(--mono)' }}>
          {pre}{Number(p.value).toLocaleString()}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary]     = useState({})
  const [top,     setTop]         = useState([])
  const [cat,     setCat]         = useState([])
  const [daily,   setDaily]       = useState([])
  const [recs,    setRecs]        = useState([])
  const [assocs,  setAssocs]      = useState([])
  const [loading, setLoading]     = useState(true)
  const [tick,    setTick]        = useState(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getSummary().catch(() => ({})),
      api.getTopProducts().catch(() => []),
      api.getCatSales().catch(() => []),
      api.getDailySales().catch(() => []),
      api.getRecommendations().catch(() => []),
      api.getAssociations().catch(() => []),
    ]).then(([s, tp, cs, ds, r, a]) => {
      setSummary(s); setTop(tp); setCat(cs)
      setDaily([...ds].reverse()); setRecs(r); setAssocs(a)
      setLoading(false)
    })
  }, [tick])

  async function applyRec(id) {
    try {
      await api.applyRec(id)
      toast('Placement applied!', 'success')
      setTick(t => t + 1)
    } catch (e) { toast(e.message, 'error') }
  }

  const pending = recs.filter(r => !r.is_applied)

  const STATS = [
    { label:'Products',     val: summary.total_products ?? 0,         color:'#06C8D4', Icon: Package },
    { label:'Transactions', val: summary.total_transactions ?? 0,      color:'#10D67B', Icon: ShoppingCart },
    { label:'Revenue',      val: summary.total_revenue ?? 0,           color:'#F59E0B', Icon: TrendingUp, pre:'₹' },
    { label:'AI Suggestions',val: summary.pending_recommendations ?? 0, color:'#A78BFA', Icon: Brain },
  ]

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar onMLRun={() => setTick(t => t + 1)} />

      <div style={{ marginLeft:240, flex:1 }}>
        {/* Topbar */}
        <div className="topbar">
          <div>
            <div className="topbar-title">Store <span>Command Center</span></div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>
              {new Date().toLocaleDateString('en-IN',{ weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            </div>
          </div>
          <Link href="/sales" className="btn-primary">
            <ShoppingCart size={14} /> New Sale
          </Link>
        </div>

        <div className="page-body">

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
            {STATS.map(({ label, val, color, Icon, pre }, i) => (
              <div key={i} className="card fade-up" style={{ animationDelay:`${i*0.07}s`, borderTop:`2px solid ${color}` }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ fontSize:30, fontWeight:800, letterSpacing:'-1px', lineHeight:1, marginBottom:6, fontFamily:'var(--mono)', color }}>
                  {loading ? <span className="skeleton" style={{ width:70, height:30, display:'inline-block' }} /> : <Counter target={val} prefix={pre} />}
                </div>
                <div style={{ fontSize:12, color:'var(--text-3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display:'grid', gridTemplateColumns:'1.7fr 1fr', gap:14, marginBottom:24 }}>
            {/* Area chart */}
            <div className="card fade-up" style={{ animationDelay:'0.2s' }}>
              <div className="card-title">
                <span className="card-dot" style={{ background:'var(--amber)' }} />
                Revenue Trend — Last 30 Days
              </div>
              {loading ? <div className="skeleton" style={{ height:220 }} /> :
               daily.length === 0 ? (
                <div className="empty" style={{ padding:'28px 0' }}>
                  <TrendingUp size={32}/><h3>No revenue data yet</h3><p>Record sales to see trends</p>
                </div>
               ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={daily} margin={{top:5,right:5,bottom:0,left:0}}>
                    <defs>
                      <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="date" tick={{fill:'var(--text-3)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={d=>d?.slice(5)}/>
                    <YAxis tick={{fill:'var(--text-3)',fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
                    <Tooltip content={<ChartTip />}/>
                    <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={2} fill="url(#rg)" dot={false} activeDot={{r:4,fill:'#F59E0B'}}/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie chart */}
            <div className="card fade-up" style={{ animationDelay:'0.25s' }}>
              <div className="card-title">
                <span className="card-dot" style={{ background:'var(--cyan)' }} />
                Sales by Category
              </div>
              {cat.length === 0 ? (
                <div className="empty" style={{ padding:'20px 0' }}><Package size={28}/><p>No data yet</p></div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={cat} dataKey="revenue" nameKey="category" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                        {cat.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                      </Pie>
                      <Tooltip content={<ChartTip />}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 10px', marginTop:6 }}>
                    {cat.slice(0,6).map((c,i) => (
                      <span key={i} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11 }}>
                        <span style={{ width:8, height:8, borderRadius:2, background:PIE_COLORS[i%PIE_COLORS.length], display:'inline-block' }}/>
                        <span style={{ color:'var(--text-3)' }}>{c.category}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>

            {/* AI Recommendations */}
            <div className="card fade-up" style={{ animationDelay:'0.3s' }}>
              <div className="card-title" style={{ justifyContent:'space-between' }}>
                <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span className="card-dot" style={{ background:'var(--purple)' }}/>
                  AI Placements ({pending.length})
                </span>
                <Link href="/store-layout" style={{ color:'var(--amber)', textDecoration:'none', fontSize:10, display:'flex', alignItems:'center', gap:2 }}>
                  All <ChevronRight size={10}/>
                </Link>
              </div>
              {pending.length === 0 ? (
                <div className="empty" style={{ padding:'20px 0' }}>
                  <Brain size={32}/>
                  <h3>No suggestions yet</h3>
                  <p>Click "Train & Optimize" in the sidebar to generate AI placement recommendations</p>
                </div>
              ) : pending.slice(0,4).map(r => (
                <div key={r.id} style={{ background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:8 }}>
                  <div style={{ fontWeight:600, fontSize:13, marginBottom:4 }}>{r.product.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:8 }}>
                    → <span style={{ color:'var(--amber)' }}>{r.zone.name}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <div className="score-track" style={{ flex:1 }}>
                      <div className="score-fill" style={{ width:`${r.score}%` }}/>
                    </div>
                    <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--amber)', fontWeight:700 }}>{r.score.toFixed(0)}</span>
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-3)', lineHeight:1.5, marginBottom:8 }}>{r.reason}</div>
                  <button onClick={() => applyRec(r.id)}
                    style={{ width:'100%', padding:'6px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:7, color:'var(--amber)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
                    ✓ Apply
                  </button>
                </div>
              ))}
            </div>

            {/* Basket associations */}
            <div className="card fade-up" style={{ animationDelay:'0.35s' }}>
              <div className="card-title">
                <span className="card-dot" style={{ background:'var(--green)' }}/>
                Bought Together — FP-Growth
              </div>
              {assocs.length === 0 ? (
                <div className="empty" style={{ padding:'20px 0' }}>
                  <Zap size={32}/>
                  <h3>No patterns yet</h3>
                  <p>Run the 5,000-sample training to discover basket associations</p>
                </div>
              ) : assocs.slice(0,7).map(a => {
                const cls = a.lift >= 2.5 ? 'lift-strong' : a.lift >= 1.5 ? 'lift-medium' : 'lift-weak'
                return (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 11px', background:'var(--ink-3)', borderRadius:9, marginBottom:6, border:'1px solid var(--border)' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:12 }}>{a.product_a.name}</div>
                      <div style={{ color:'var(--text-3)', fontSize:11, marginTop:1 }}>+ {a.product_b.name}</div>
                    </div>
                    <span style={{ padding:'3px 8px', borderRadius:6, fontFamily:'var(--mono)', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }} className={cls}>
                      ×{a.lift.toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Top sellers */}
            <div className="card fade-up" style={{ animationDelay:'0.4s' }}>
              <div className="card-title">
                <span className="card-dot" style={{ background:'#FB923C' }}/>
                Top Sellers
              </div>
              {top.length === 0 ? (
                <div className="empty" style={{ padding:'20px 0' }}><Package size={28}/><p>No sales yet</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={top.slice(0,7)} layout="vertical" margin={{top:0,right:8,bottom:0,left:4}}>
                    <XAxis type="number" tick={{fill:'var(--text-3)',fontSize:9}} tickLine={false} axisLine={false}/>
                    <YAxis type="category" dataKey="name" width={88} tick={{fill:'var(--text-2)',fontSize:10}} tickLine={false} axisLine={false}
                      tickFormatter={n => n?.length > 13 ? n.slice(0,12)+'…' : n}/>
                    <Tooltip content={<ChartTip pre="" />}/>
                    <Bar dataKey="total_qty" fill="#F59E0B" radius={[0,5,5,0]} name="Units Sold"
                      background={{fill:'var(--ink-3)',radius:[0,5,5,0]}}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
