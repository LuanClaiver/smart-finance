import { useEffect, useState } from 'react'
import { subscribeToToasts, type ToastPayload } from '../services/toast'

const icons = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '⚠',
}

export default function ToastHost() {
  const [items, setItems] = useState<ToastPayload[]>([])

  useEffect(() => subscribeToToasts((payload) => {
    const item = { ...payload, id: payload.id || `${Date.now()}-${Math.random()}` }
    setItems((current) => [...current.slice(-3), item])
    window.setTimeout(() => {
      setItems((current) => current.filter((toast) => toast.id !== item.id))
    }, item.duration || 3800)
  }), [])

  function dismiss(id?: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  return <div className="toast-host" aria-live="polite" aria-atomic="false">
    {items.map((item) => <div key={item.id} className={`smart-toast ${item.kind}`} role={item.kind === 'error' ? 'alert' : 'status'}>
      <span className="toast-icon">{icons[item.kind]}</span>
      <div className="toast-copy"><strong>{item.title}</strong>{item.message && <small>{item.message}</small>}</div>
      <button type="button" aria-label="Fechar aviso" onClick={() => dismiss(item.id)}>×</button>
    </div>)}
  </div>
}
