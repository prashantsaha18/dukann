'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import api from '@/lib/api'
import { toast } from '@/components/Toast'
import { Brain, Zap, CheckCircle } from 'lucide-react'

const ZS = {
  high_traffic:{ color:'#818CF8', bg:'rgba(129,140,248,0.07)', bd:'rgba(129,140,248,0.4)', label:'🚶 High Traffic' },
  eye_level:   { color:'#06C8D4', bg:'rgba(6,200,212,0.07)',   bd:'rgba(6,200,212,0.4)',   label:'👁 Eye Level' },
  checkout:    { color:'#F59E0B', bg:'rgba(245,158,11,0.08)',  bd:'rgba(245,158,11,0.5)',  label:'💳 Checkout' },
  cold:        { color:'#93C5FD', bg:'rgba(147,197,253,0.06)', bd:'rgba(147,197,253,0.35)',label:'❄️ Cold' },
  bulk:        { color:'#A78BFA', bg:'rgba(167,139,250,0.06)', bd:'rgba(167,139,250,0.3)', label:'📦 Bulk' },
}

export default function LayoutPage() {
  const [zones,  setZones]   = useState([])
  const [recs,   setRecs]    = useState([])
  const [assocs, setAssocs]  = useState([])
  const [sel,    setSel]     = useState(null)
  const [busy,   setBusy]    = useState(false)
  const [tab,    setTab]     = useState('recs')
  const [loading,setLoading] = useState(true)

  useEffect(()=>{ load() },[])

  async function load() {
    setLoading(true)
    try {
      const [z,r,a] = await Promise.all([api.getZones(),api.getRecommendations(),api.getAssociations()])
      setZones(z); setRecs(r); setAssocs(a)
    } catch { toast('Failed to load','error') }
    setLoading(false)
  }

  async function runML() {
    setBusy(true)
    try {
      const res = await api.runML()
      toast(`✓ ${res.recommendations_generated} placements · ${res.association_rules_found} patterns`,'success')
      await load()
    } catch(e) { toast(e.message||'ML failed','error') }
    setBusy(false)
  }

  async function applyRec(id) {
    try { await api.applyRec(id); toast('Placement applied!','success'); load() }
    catch { toast('Failed','error') }
  }

  const maxX    = zones.length ? Math.max(...zones.map(z=>z.x))+1 : 4
  const maxY    = zones.length ? Math.max(...zones.map(z=>z.y))+1 : 3
  const pending = recs.filter(r=>!r.is_applied)
  const byZone  = {}
  pending.forEach(r=>{ if(!byZone[r.zone.id]) byZone[r.zone.id]=[]; byZone[r.zone.id].push(r) })

  const zoneRecs    = sel ? pending.filter(r=>r.zone.id===sel) : pending
  const selectedZone= zones.find(z=>z.id===sel)
  const strongAssocs= assocs.filter(a=>a.strength!=='WEAK')

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--ink)' }}>
      <Sidebar onMLRun={load}/>
      <div style={{ marginLeft:240, flex:1 }}>
        {/* Topbar */}
        <div style={{ height:64, padding:'0 36px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--ink-2)', position:'sticky', top:0, zIndex:50 }}>
          <div>
            <div style={{ fontSize:17, fontWeight:700 }}>Store <span style={{ color:'var(--amber)' }}>Layout Map</span></div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{zones.length} zones · {pending.length} pending AI placements</div>
          </div>
          <button onClick={runML} disabled={busy} style={{ padding:'9px 18px', background:busy?'var(--ink-3)':'linear-gradient(135deg,#F59E0B,#D97706)', border:'none', borderRadius:9, color:busy?'var(--text-3)':'var(--ink)', fontFamily:'var(--font)', fontSize:13, fontWeight:700, cursor:busy?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Brain size={14}/>{busy?'Analyzing…':'Run ML'}
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', minHeight:'calc(100vh - 64px)' }}>
          {/* Floor plan */}
          <div style={{ padding:24 }}>
            {/* Legend */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px', marginBottom:16, padding:'10px 16px', background:'var(--ink-2)', borderRadius:10, border:'1px solid var(--border)', alignItems:'center' }}>
              {Object.entries(ZS).map(([t,s])=>(
                <div key={t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                  <div style={{ width:10, height:10, borderRadius:3, background:s.bg, border:`2px solid ${s.color}` }}/>
                  <span style={{ color:'var(--text-3)' }}>{s.label}</span>
                </div>
              ))}
              {pending.length>0&&(
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--amber)', animation:'pulse 2s infinite', boxShadow:'0 0 6px var(--amber)' }}/>
                  <span style={{ color:'var(--amber)' }}>AI suggestion pending</span>
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, padding:20, background:'var(--ink-3)', borderRadius:16 }}>
                {[...Array(9)].map((_,i)=><div key={i} style={{ height:110, background:'var(--ink-2)', borderRadius:10, animation:'shimmer 1.5s infinite', animationDelay:`${i*0.05}s` }}/>)}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${maxX},1fr)`, gridTemplateRows:`repeat(${maxY},minmax(110px,auto))`, gap:10, padding:20, background:'var(--ink-3)', borderRadius:16, border:'1px solid var(--border)' }}>
                {zones.map(zone=>{
                  const s      = ZS[zone.type]||ZS.bulk
                  const hasRec = (byZone[zone.id]||[]).length>0
                  const isSel  = sel===zone.id
                  return (
                    <div key={zone.id} onClick={()=>setSel(isSel?null:zone.id)} style={{
                      gridColumn:`${zone.x+1}`, gridRow:`${zone.y+1}`,
                      borderRadius:12, padding:14, border:`2px solid ${isSel?s.color:hasRec?s.bd:'transparent'}`,
                      background: isSel?`${s.color}14`:s.bg, cursor:'pointer',
                      outline: isSel?`2px solid ${s.color}`:hasRec?`0px solid ${s.color}`:'none',
                      outlineOffset:2, transition:'all 0.25s',
                      animation: hasRec ? 'recPulse 2s infinite' : 'none',
                    }}>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:s.color, marginBottom:5 }}>
                        {zone.name} {hasRec&&<span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'var(--amber)', marginLeft:4, verticalAlign:'middle' }}/>}
                      </div>
                      <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:7 }}>{'⭐'.repeat(Math.round(zone.visibility_score/2))} {zone.visibility_score}/10</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                        {zone.products?.slice(0,2).map(p=>(
                          <div key={p.id} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(255,255,255,0.07)', color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        ))}
                        {(byZone[zone.id]||[]).slice(0,2).map(r=>(
                          <div key={r.id} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.15)', color:'var(--amber)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>✨ {r.product.name}</div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ marginTop:10, padding:'7px 16px', background:'rgba(16,214,123,0.05)', border:'1px dashed rgba(16,214,123,0.2)', borderRadius:8, textAlign:'center', fontSize:12, color:'var(--green)' }}>
              🚪 Main Customer Entrance →
            </div>
          </div>

          {/* Side Panel */}
          <div style={{ background:'var(--ink-2)', borderLeft:'1px solid var(--border)', padding:20, overflowY:'auto', height:'calc(100vh - 64px)' }}>
            {selectedZone&&(
              <div style={{ marginBottom:14, padding:'12px 14px', background:'var(--ink-3)', border:`1px solid ${(ZS[selectedZone.type]||{}).color||'var(--border)'}40`, borderRadius:10 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:3 }}>{selectedZone.name}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:6 }}>Visibility {selectedZone.visibility_score}/10 · {selectedZone.product_count}/{selectedZone.capacity} products</div>
                <button onClick={()=>setSel(null)} style={{ fontSize:11, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', padding:0 }}>← All zones</button>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display:'flex', gap:4, background:'var(--ink-3)', borderRadius:10, padding:4, marginBottom:16 }}>
              {[['recs',`Placements (${zoneRecs.length})`],['basket',`Basket (${strongAssocs.length})`]].map(([t,l])=>(
                <button key={t} onClick={()=>setTab(t)} style={{
                  flex:1, padding:'8px 10px', border:'none', fontFamily:'var(--font)', fontSize:12, fontWeight:600, borderRadius:7, cursor:'pointer', transition:'all 0.15s',
                  background:tab===t?'var(--ink-2)':'transparent', color:tab===t?'var(--amber)':'var(--text-3)',
                  boxShadow:tab===t?'0 2px 8px rgba(0,0,0,0.3)':'none',
                }}>{l}</button>
              ))}
            </div>

            {tab==='recs'&&(
              <div>
                {zoneRecs.length===0 ? (
                  <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-3)' }}>
                    <Brain size={32} style={{ margin:'0 auto 8px', display:'block', opacity:0.25 }}/>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:4, color:'var(--text-2)' }}>No recommendations</div>
                    <div style={{ fontSize:11, lineHeight:1.6 }}>Run ML training with 5000 dataset to generate AI placement suggestions</div>
                  </div>
                ) : zoneRecs.map(r=>(
                  <div key={r.id} style={{ background:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <div style={{ fontWeight:600, fontSize:13 }}>{r.product.name}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--amber)', fontWeight:700 }}>{r.score.toFixed(0)}</div>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:2 }}>{r.product.category} · ₹{r.product.price} · {r.product.margin_pct}% margin</div>
                    <div style={{ fontSize:11, color:'var(--cyan)', marginBottom:10 }}>Move to → {r.zone.name}</div>
                    <div style={{ height:3, background:'var(--ink-4)', borderRadius:2, marginBottom:8 }}><div style={{ height:'100%', width:`${r.score}%`, background:'linear-gradient(90deg,var(--amber),var(--cyan))', borderRadius:2 }}/></div>
                    <div style={{ fontSize:10, color:'var(--text-3)', lineHeight:1.5, marginBottom:10 }}>{r.reason}</div>
                    <button onClick={()=>applyRec(r.id)} style={{ width:'100%', padding:'7px', background:'rgba(16,214,123,0.08)', border:'1px solid rgba(16,214,123,0.2)', borderRadius:7, color:'var(--green)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                      <CheckCircle size={12}/> Apply Placement
                    </button>
                  </div>
                ))}
                {recs.filter(r=>r.is_applied).length>0&&(
                  <div style={{ padding:'8px 12px', background:'rgba(16,214,123,0.06)', borderRadius:8, border:'1px solid rgba(16,214,123,0.15)', fontSize:11, color:'var(--green)' }}>
                    <CheckCircle size={11} style={{ display:'inline', marginRight:4 }}/>{recs.filter(r=>r.is_applied).length} placements already applied
                  </div>
                )}
              </div>
            )}

            {tab==='basket'&&(
              <div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:12, lineHeight:1.6 }}>Products with high lift should be placed in adjacent zones for cross-selling.</div>
                {strongAssocs.length===0 ? (
                  <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text-3)' }}>
                    <Zap size={32} style={{ margin:'0 auto 8px', display:'block', opacity:0.25 }}/>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:4, color:'var(--text-2)' }}>No strong patterns</div>
                    <div style={{ fontSize:11, lineHeight:1.6 }}>Run the 5000-sample training to discover basket associations</div>
                  </div>
                ) : strongAssocs.map(a=>{
                  const liftC = a.lift>=2.5?'#10D67B':a.lift>=1.5?'#F59E0B':'var(--text-3)'
                  const liftB = a.lift>=2.5?'rgba(16,214,123,0.1)':a.lift>=1.5?'rgba(245,158,11,0.1)':'var(--ink-4)'
                  return (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--ink-3)', borderRadius:9, marginBottom:7, border:'1px solid var(--border)' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:12 }}>{a.product_a.name}</div>
                        <div style={{ color:'var(--text-3)', fontSize:11, marginTop:2 }}>+ {a.product_b.name}</div>
                        <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3, fontFamily:'var(--mono)' }}>conf: {(a.confidence*100).toFixed(0)}%</div>
                      </div>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ padding:'4px 8px', borderRadius:6, background:liftB, color:liftC, border:`1px solid ${liftC}30`, fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>×{a.lift.toFixed(2)}</div>
                        <div style={{ fontSize:9, color:'var(--text-3)', marginTop:3, fontFamily:'var(--mono)' }}>{a.strength}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.4)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  )
}
