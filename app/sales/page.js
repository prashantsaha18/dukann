'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import { toast } from '@/components/Toast'
import { Search, Trash2, Plus, Minus, CheckCircle, Receipt, X } from 'lucide-react'

const EMO   = { Dairy:'🧈',Staples:'🌾',Snacks:'🍟',Household:'🧹',Personal:'🪥',Beverages:'🥤',Bakery:'🍞',Chocolate:'🍫',Frozen:'🧊',Organic:'🌿',Other:'📦' }
const COLORS = { Dairy:'#64B5F6',Staples:'#81C784',Snacks:'#FFB74D',Household:'#CE93D8',Personal:'#F48FB1',Beverages:'#4FC3F7',Bakery:'#A1887F',Chocolate:'#8D6E63',Frozen:'#80DEEA',Organic:'#AED581',Other:'#90A4AE' }

export default function SalesPage() {
  const [products,setProducts] = useState([])
  const [cart,setCart]         = useState([])
  const [search,setSearch]     = useState('')
  const [cat,setCat]           = useState('All')
  const [recent,setRecent]     = useState([])
  const [flashed,setFlashed]   = useState({})
  const [posting,setPosting]   = useState(false)
  const [done,setDone]         = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    api.getProducts().then(setProducts).catch(()=>{})
    api.getRecentTxns().then(setRecent).catch(()=>{})
    ref.current?.focus()
  },[])

  function addToCart(p) {
    setFlashed(f=>({...f,[p.id]:true}))
    setTimeout(()=>setFlashed(f=>({...f,[p.id]:false})),350)
    setCart(prev => {
      const ex = prev.find(c=>c.product_id===p.id)
      if (ex) return prev.map(c=>c.product_id===p.id?{...c,qty:c.qty+1}:c)
      return [...prev,{ product_id:p.id, name:p.name, price:p.price, qty:1, cat:p.category }]
    })
  }

  function updateQty(pid, d) { setCart(p=>p.map(c=>c.product_id===pid?{...c,qty:Math.max(1,c.qty+d)}:c)) }
  function remove(pid)       { setCart(p=>p.filter(c=>c.product_id!==pid)) }

  async function record() {
    if (!cart.length) return
    setPosting(true)
    try {
      await api.createTransaction({ items: cart.map(c=>({ product_id:c.product_id, quantity:c.qty, unit_price:c.price })) })
      setDone(true); setCart([])
      toast(`₹${total.toFixed(0)} sale recorded!`,'success')
      setTimeout(()=>setDone(false),2500)
      api.getRecentTxns().then(setRecent)
    } catch(e) { toast(e.message||'Failed','error') }
    setPosting(false)
  }

  const cats    = ['All',...new Set(products.map(p=>p.category))]
  const visible = products.filter(p=>(cat==='All'||p.category===cat)&&(!search||p.name.toLowerCase().includes(search.toLowerCase())))
  const total   = cart.reduce((s,c)=>s+c.price*c.qty,0)
  const count   = cart.reduce((s,c)=>s+c.qty,0)

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--ink)' }}>
      <Sidebar/>
      <div style={{ marginLeft:240, flex:1, display:'flex', flexDirection:'column' }}>
        {/* Topbar */}
        <div style={{ height:64, padding:'0 20px 0 36px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--ink-2)', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>POS <span style={{ color:'var(--amber)' }}>Terminal</span></div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1, fontFamily:'var(--mono)' }}>
              {new Date().toLocaleDateString('en-IN')} · {new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
          <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:'var(--mono)' }}>{products.length} products loaded</div>
        </div>

        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 360px', overflow:'hidden' }}>
          {/* Product Grid */}
          <div style={{ overflow:'auto', padding:20, background:'var(--ink)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--ink-2)', border:'1px solid var(--border)', borderRadius:10, padding:'11px 14px', marginBottom:12 }}>
              <Search size={15} color="var(--text-3)"/>
              <input ref={ref} placeholder="Search products…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ background:'none', border:'none', color:'var(--text)', fontFamily:'var(--font)', fontSize:14, flex:1, outline:'none' }}/>
              {search&&<button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex' }}><X size={13}/></button>}
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setCat(c)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', border:cat===c?'1px solid rgba(245,158,11,0.3)':'1px solid var(--border)', background:cat===c?'rgba(245,158,11,0.1)':'transparent', color:cat===c?'var(--amber)':'var(--text-3)' }}>
                  {EMO[c]||''} {c}
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))', gap:10 }}>
              {visible.map(p => {
                const inCart = cart.find(c=>c.product_id===p.id)
                return (
                  <div key={p.id} onClick={()=>addToCart(p)} style={{
                    background: flashed[p.id] ? 'rgba(245,158,11,0.15)' : 'var(--ink-2)',
                    border:`1px solid ${inCart?'rgba(245,158,11,0.5)':'var(--border)'}`,
                    borderRadius:12, padding:14, cursor:'pointer', transition:'all 0.15s',
                    position:'relative', userSelect:'none',
                  }}
                  onMouseEnter={e=>{ if(!flashed[p.id]) e.currentTarget.style.borderColor='var(--amber)'; e.currentTarget.style.transform='translateY(-2px)' }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor=inCart?'rgba(245,158,11,0.5)':'var(--border)'; e.currentTarget.style.transform='translateY(0)' }}>
                    <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:COLORS[p.category]||'var(--text-3)', marginBottom:8 }}>
                      {EMO[p.category]} {p.category}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, lineHeight:1.3, marginBottom:10 }}>{p.name}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--amber)', fontFamily:'var(--mono)' }}>₹{p.price}</div>
                    <div style={{ fontSize:10, color:p.stock_quantity<10?'#F43F5E':'var(--text-3)', marginTop:4 }}>
                      {p.stock_quantity<10 ? `⚠ ${p.stock_quantity} left` : `${p.stock_quantity} in stock`}
                    </div>
                    {inCart&&(
                      <div style={{ position:'absolute', top:8, right:8, width:20, height:20, borderRadius:'50%', background:'var(--amber)', color:'var(--ink)', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {inCart.qty}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Receipt Panel */}
          <div style={{ background:'var(--ink-2)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', height:'calc(100vh - 64px)' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}><Receipt size={14} color="var(--amber)"/> Current Bill</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2, fontFamily:'var(--mono)' }}>{count} item{count!==1?'s':''}</div>
              </div>
              {cart.length>0&&<button onClick={()=>setCart([])} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:11 }}>Clear all</button>}
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:12 }}>
              {done&&(
                <div style={{ textAlign:'center', padding:'32px 16px' }}>
                  <CheckCircle size={52} color="var(--green)" style={{ margin:'0 auto 10px', display:'block' }}/>
                  <div style={{ fontSize:16, fontWeight:700, color:'var(--green)', marginBottom:4 }}>Sale Recorded!</div>
                  <div style={{ fontSize:12, color:'var(--text-3)' }}>ML model learns from this data</div>
                </div>
              )}
              {!done&&cart.length===0&&(
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:200, color:'var(--text-3)', fontSize:13, gap:8 }}>
                  <Receipt size={36} style={{ opacity:0.2 }}/>Tap products to add
                </div>
              )}
              {!done&&cart.map(item=>(
                <div key={item.product_id} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px', borderRadius:8, marginBottom:4, background:'var(--ink-3)' }}>
                  <div style={{ flex:1, fontSize:12, fontWeight:500 }}>{item.name}</div>
                  <button onClick={()=>updateQty(item.product_id,-1)} style={{ width:24, height:24, background:'var(--ink-4)', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', color:'var(--text-2)', display:'flex', alignItems:'center', justifyContent:'center' }}><Minus size={10}/></button>
                  <span style={{ fontFamily:'var(--mono)', fontSize:12, width:20, textAlign:'center' }}>{item.qty}</span>
                  <button onClick={()=>updateQty(item.product_id,1)} style={{ width:24, height:24, background:'var(--ink-4)', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', color:'var(--text-2)', display:'flex', alignItems:'center', justifyContent:'center' }}><Plus size={10}/></button>
                  <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--amber)', width:56, textAlign:'right' }}>₹{(item.price*item.qty).toFixed(0)}</span>
                  <button onClick={()=>remove(item.product_id)} style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', transition:'color 0.15s' }} onMouseEnter={e=>e.currentTarget.style.color='var(--red)'} onMouseLeave={e=>e.currentTarget.style.color='var(--text-3)'}><Trash2 size={12}/></button>
                </div>
              ))}
            </div>

            <div style={{ padding:'14px 18px', borderTop:'1px solid var(--border)' }}>
              <div style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:12, color:'var(--text-3)' }}>
                  <span>Subtotal</span><span style={{ fontFamily:'var(--mono)' }}>₹{total.toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', paddingTop:10, marginTop:4 }}>
                  <span style={{ fontSize:14, fontWeight:700 }}>TOTAL</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:800, color:'var(--amber)' }}>₹{total.toFixed(2)}</span>
                </div>
              </div>
              <button onClick={record} disabled={cart.length===0||posting} style={{
                width:'100%', padding:14, background:cart.length===0||posting?'var(--ink-3)':'linear-gradient(135deg,#F59E0B,#D97706)',
                border:'none', borderRadius:10, color:cart.length===0||posting?'var(--text-3)':'var(--ink)',
                fontFamily:'var(--font)', fontSize:15, fontWeight:800, cursor:cart.length===0?'not-allowed':'pointer', transition:'all 0.2s',
                boxShadow:cart.length>0&&!posting?'0 4px 20px rgba(245,158,11,0.35)':'none',
              }}>
                {posting?'Recording…':`RECORD SALE · ₹${total.toFixed(0)}`}
              </button>
            </div>

            {/* Recent */}
            <div style={{ padding:'10px 16px 16px', borderTop:'1px solid var(--border)', maxHeight:180, overflowY:'auto' }}>
              <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Recent Sales</div>
              {recent.slice(0,5).map(r=>(
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'var(--ink-3)', borderRadius:8, marginBottom:5 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:600 }}>{new Date(r.date).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
                    <div style={{ fontSize:10, color:'var(--text-3)' }}>{r.item_count} items</div>
                  </div>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:13, color:'var(--amber)' }}>₹{r.total.toFixed(0)}</span>
                </div>
              ))}
              {!recent.length&&<div style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', padding:'8px 0' }}>No sales yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
