'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

let _id = 0
const _cbs = []

export function toast(msg, type = 'info') {
  const id = ++_id
  _cbs.forEach(fn => fn({ id, msg, type }))
}

function useToasts() {
  const [list, setList] = useState([])
  useEffect(() => {
    const fn = t => {
      setList(p => [...p, t])
      setTimeout(() => setList(p => p.filter(x => x.id !== t.id)), 3500)
    }
    _cbs.push(fn)
    return () => { const i = _cbs.indexOf(fn); if (i > -1) _cbs.splice(i, 1) }
  }, [])
  return list
}

const ICON = { success: CheckCircle, error: XCircle, info: Info }

export default function ToastContainer() {
  const toasts = useToasts()
  return (
    <div className="toast-wrap">
      {toasts.map(t => {
        const Icon = ICON[t.type] || Info
        return (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon size={15} />
            <span>{t.msg}</span>
          </div>
        )
      })}
    </div>
  )
}
