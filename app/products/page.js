'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import { toast } from '@/components/Toast'
import { Plus, Search, X, Clock, TrendingUp, MapPin } from 'lucide-react'

const CATS = ['Dairy','Staples','Snacks','Household','Personal','Beverages','Bakery','Chocolate','Frozen','Organic','Other']
const EMO  = { Dairy:'🧈',Staples:'🌾',Snacks:'🍟',Household:'🧹',Personal:'🪥',Beverages:'🥤',Bakery:'🍞',Chocolate:'🍫',Frozen:'🧊',Organic:'🌿',Other:'📦' }

export default function ProductsPage() {
  const [products,setProducts] = useState([])
  const [loading,setLoading]   = useState(true)
  const [search,setSearch]     = useState('')
  const [cat,setCat]           = useState('All')
  const [showModal,setModal]   = useState(false)
  const [maxVel,setMaxVel]     = useState(1)
  const [saving,setSaving]     = useState(false)
  const [form,setForm]         = useState({ name:'',category:'Snacks',price:'',cost:'',stock_quantity:'',shelf_life_days:'365' })

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    try {
      const d = await api.getProducts()
      setProducts(d)
      setMaxVel(Math.max(...d.map(p=>p.daily_velocity||0),1))
    } catch { toast('Failed to load','error') }
    setLoading(false)
  }

  async function save() {
    if (!form.name||!form.price||!form.cost) { toast('Name, price and cost required','error'); return }
    setSaving(true)
    try {
      await api.createProduct({ name:form.name,category:form.category,price:+form.price,cost:+form.cost,stock_quantity:+form.stock_quantity||0,shelf_life_days:+form.shelf_life_days||365 })
      toast(`${form.name} added!`,'success')
      setModal(false)
      setForm({ name:'',category:'Snacks',price:'',cost:'',stock_quantity:'',shelf_life_days:'365' })
      load()
    } catch(e) { toast(e.message,'error') }
    setSaving(false)
  }

  const cats    = ['All',...new Set(products.map(p=>p.category))]
  const visible = products.filter(p => (cat==='All'||p.category===cat) && (!search||p.name.toLowerCase().includes(search.toLowerCase())))

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--ink)' }}>
      <Sidebar />
      <div style={{ marginLeft:240, flex:1 }}>
        {/* Topbar */}
        <div style={{ height:64, padding:'0 36px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--ink-2)', position:'sticky', top:0, zIndex:50 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>Product <span style={{ color:'var(--amber)' }}>Inventory</span></div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{products.length} products · {products.reduce((s,p)=>s+(p.stock_quantity||0),0).toLocaleString()} units total</div>
          </div>
          <button onClick={()=>setModal(true)} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#F59E0B,#D97706)', border:'none', borderRadius:9, color:'#07090F', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={14}/> Add Product
          </button>
        </div>

        <div style={{ padding:'20px 36px 40px' }}>
          {/* Search + filter */}
          <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--ink-2)', border:'1px solid var(--border)', borderRadius:10, padding:'11px 14px', flex:1 }}>
              <Search size={14} color="var(--text-3)"/>
              <input placeholder="Search products…" value={search} onChange={e=>setSearch(e.target.value)}
                style={{ background:'none', border:'none', color:'var(--text)', fontFamily:'var(--font)', fontSize:14, flex:1, outline:'none' }}/>
              {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex' }}><X size={13}/></button>}
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
            {cats.map(c => (
              <button key={c} onClick={()=>setCat(c)} style={{
                padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)',
                border: cat===c ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border)',
                background: cat===c ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: cat===c ? 'var(--amber)' : 'var(--text-3)',
              }}>{EMO[c]||''} {c}</button>
            ))}
          </div>

          {/* Table */}
          <div style={{ background:'var(--ink-2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:24 }}>{[...Array(8)].map((_,i)=><div key={i} style={{ height:44, marginBottom:6, background:'var(--ink-3)', borderRadius:8, animation:'shimmer 1.5s infinite', animationDelay:`${i*0.05}s` }}/>)}</div>
            ) : visible.length===0 ? (
              <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--text-3)' }}>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:6, color:'var(--text-2)' }}>No products found</div>
                <div style={{ fontSize:13 }}>Try a different search or add new products</div>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      {['Product','Category','Price','Cost','Margin','Stock','Velocity','Shelf','Zone'].map(h=>(
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'1px', borderBottom:'1px solid var(--border)', background:'var(--ink-2)', position:'sticky', top:0 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(p => {
                      const margin  = p.price>0 ? (p.price-p.cost)/p.price*100 : 0
                      const velPct  = maxVel>0 ? p.daily_velocity/maxVel*100 : 0
                      const mColor  = margin>=25?'#10D67B':margin>=15?'#F59E0B':'#F43F5E'
                      const mBg     = margin>=25?'rgba(16,214,123,0.1)':margin>=15?'rgba(245,158,11,0.1)':'rgba(244,63,94,0.1)'
                      return (
                        <tr key={p.id} style={{ transition:'background 0.1s' }}
                          onMouseEnter={e=>e.currentTarget.style.background='var(--ink-3)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                            <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                            <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)', marginTop:2 }}>{p.total_sold} sold</div>
                          </td>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                            <span style={{ fontSize:10, padding:'3px 9px', borderRadius:20, background:'var(--ink-4)', color:'var(--text-3)', border:'1px solid var(--border)', fontWeight:600 }}>{EMO[p.category]} {p.category}</span>
                          </td>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', fontFamily:'var(--mono)', fontWeight:700, color:'var(--amber)' }}>₹{p.price}</td>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', fontFamily:'var(--mono)', color:'var(--text-2)' }}>₹{p.cost}</td>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                            <span style={{ padding:'3px 8px', borderRadius:20, background:mBg, color:mColor, fontFamily:'var(--mono)', fontSize:11, fontWeight:700 }}>{margin.toFixed(1)}%</span>
                          </td>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', fontFamily:'var(--mono)', fontWeight:700, color:p.stock_quantity<10?'#F43F5E':p.stock_quantity<30?'#F59E0B':'var(--text)' }}>{p.stock_quantity}</td>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:60, height:4, background:'var(--ink-4)', borderRadius:2, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${velPct}%`, background:'linear-gradient(90deg,var(--cyan),var(--amber))', borderRadius:2 }}/>
                              </div>
                              <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--text-3)' }}>{p.daily_velocity.toFixed(1)}/d</span>
                            </div>
                          </td>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', fontSize:11, color:p.shelf_life_days<=7?'#F43F5E':'var(--text-3)' }}>
                            <Clock size={11} style={{ display:'inline', marginRight:3 }}/>{p.shelf_life_days}d
                          </td>
                          <td style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)' }}>
                            {p.current_zone
                              ? <span style={{ fontSize:11, color:'var(--cyan)', display:'flex', alignItems:'center', gap:4 }}><MapPin size={11}/>{p.current_zone}</span>
                              : <span style={{ fontSize:11, color:'var(--text-3)' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={e=>e.target===e.currentTarget&&setModal(false)} style={{ position:'fixed', inset:0, background:'rgba(7,9,15,0.8)', backdropFilter:'blur(4px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'var(--ink-2)', border:'1px solid var(--border-2)', borderRadius:16, padding:28, width:500, maxWidth:'94vw', boxShadow:'0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:700 }}>Add New Product</div>
              <button onClick={()=>setModal(false)} style={{ background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8, width:32, height:32, cursor:'pointer', color:'var(--text-3)', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={15}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[['name','Product Name','text','e.g. Maggi Noodles 70g'],['price','Selling Price ₹','number','14'],['cost','Cost Price ₹','number','10'],['stock_quantity','Stock Qty','number','100'],['shelf_life_days','Shelf Life (days)','number','365']].map(([k,label,type,ph])=>(
                <div key={k}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>{label}</div>
                  <input type={type} placeholder={ph} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}
                    style={{ width:'100%', background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', color:'var(--text)', fontFamily:'var(--font)', fontSize:13, outline:'none' }}
                    onFocus={e=>e.target.style.borderColor='var(--amber)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                </div>
              ))}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Category</div>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}
                  style={{ width:'100%', background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', color:'var(--text)', fontFamily:'var(--font)', fontSize:13, outline:'none' }}>
                  {CATS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              {form.price&&form.cost&&(
                <div style={{ padding:'10px 14px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, fontSize:12 }}>
                  Margin: <strong style={{ color:'var(--amber)', fontFamily:'var(--mono)' }}>{((form.price-form.cost)/form.price*100).toFixed(1)}%</strong>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:24 }}>
              <button onClick={save} disabled={saving} style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#F59E0B,#D97706)', border:'none', borderRadius:9, color:'#07090F', fontFamily:'var(--font)', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                {saving?'Saving…':'+ Add Product'}
              </button>
              <button onClick={()=>setModal(false)} style={{ padding:'11px 18px', background:'transparent', border:'1px solid var(--border)', borderRadius:9, color:'var(--text-3)', fontFamily:'var(--font)', fontSize:13, cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
