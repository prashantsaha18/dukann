'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, Map, Zap, Brain } from 'lucide-react'
import api from '@/lib/api'
import { toast } from '@/components/Toast'

const NAV = [
  { href: '/',             icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/products',     icon: Package,          label: 'Products'     },
  { href: '/sales',        icon: ShoppingCart,     label: 'POS Terminal' },
  { href: '/store-layout', icon: Map,              label: 'Store Map'    },
]

export default function Sidebar({ onMLRun }) {
  const path = usePathname()
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState(null)   // { text, ok }

  async function runML() {
    setBusy(true)
    setMsg({ text: 'Analyzing sales data…', ok: null })
    try {
      const res = await api.runML()
      const text = `✓ ${res.recommendations_generated} placements · ${res.association_rules_found} patterns`
      setMsg({ text, ok: true })
      toast(text, 'success')
      onMLRun?.()
      setTimeout(() => setMsg(null), 8000)
    } catch (e) {
      const text = e.message || 'Backend unreachable'
      setMsg({ text, ok: false })
      toast(text, 'error')
    }
    setBusy(false)
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)', marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg,#F59E0B,#D97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 16, color: '#07090F',
            boxShadow: '0 4px 20px rgba(245,158,11,0.35)',
          }}>D</div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>DukanAI</span>
        </Link>
        <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Retail Intelligence v1.0
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '1px', padding: '8px 8px 4px', marginTop: 4 }}>
          Navigation
        </div>
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={`nav-link ${path === href ? 'active' : ''}`}>
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* ML Button */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={runML}
          disabled={busy}
          className={busy ? '' : 'ml-glow'}
          style={{
            width: '100%', padding: '12px 16px', border: 'none', borderRadius: 10,
            background: busy ? 'var(--ink-3)' : 'linear-gradient(135deg,#F59E0B,#D97706)',
            color: busy ? 'var(--text-3)' : '#07090F',
            fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
          {busy ? <Brain size={15} /> : <Zap size={15} />}
          {busy ? 'Training…' : 'Train & Optimize'}
        </button>

        {msg && (
          <div style={{
            marginTop: 8, fontSize: 11, lineHeight: 1.5,
            padding: '8px 10px', borderRadius: 8, fontFamily: 'var(--mono)',
            ...(msg.ok === true  ? { background: 'rgba(16,214,123,0.08)',  color: 'var(--green)', border: '1px solid rgba(16,214,123,0.2)'  } :
                msg.ok === false ? { background: 'rgba(244,63,94,0.08)',   color: 'var(--red)',   border: '1px solid rgba(244,63,94,0.2)'   } :
                                   { background: 'var(--ink-3)',           color: 'var(--text-2)'                                          }),
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--ink-3)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>API</div>
          <div style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>
            {process.env.NEXT_PUBLIC_API_URL || 'localhost:8000'}
          </div>
        </div>
      </div>
    </aside>
  )
}
