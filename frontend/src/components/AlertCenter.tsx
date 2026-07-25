import { useEffect, useRef, useState } from 'react'
import { api, money } from '../services/api'
import { navigateTo } from '../services/navigation'
import type { AlertItem } from '../types'

export default function AlertCenter() {
  const [items, setItems] = useState<AlertItem[]>([])
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    api<AlertItem[]>('/alerts').then((data) => {
      setItems(data)
      if ('Notification' in window && Notification.permission === 'granted') {
        const notified = new Set<string>(JSON.parse(sessionStorage.getItem('smart-finance-notified') || '[]'))
        data.filter((item) => item.level !== 'info').slice(0, 3).forEach((item) => {
          const key = `${item.type}:${item.target_id}:${item.date}`
          if (!notified.has(key)) {
            try {
              const notification = new Notification(item.title, { body: `${item.message} • ${money(item.amount)}`, icon: '/icon.svg' })
              notification.onclick = () => {
                window.focus()
                navigateTo(item.target_page, item.target_id, item.month)
                notification.close()
              }
            } catch { /* navegador sem contexto seguro */ }
            notified.add(key)
          }
        })
        sessionStorage.setItem('smart-finance-notified', JSON.stringify([...notified]))
      }
    }).catch(() => undefined)
  }, [])

  async function enableNotifications() {
    if ('Notification' in window) await Notification.requestPermission()
  }

  function openItem(item: AlertItem) {
    setOpen(false)
    navigateTo(item.target_page, item.target_id, item.month)
  }

  return (
    <div className="alert-center" ref={rootRef}>
      <button className="notification-button" onClick={() => setOpen(!open)} aria-label="Abrir notificações">🔔{items.length > 0 && <b>{items.length}</b>}</button>
      {open && <button type="button" className="alert-mobile-backdrop" aria-label="Fechar alertas" onClick={() => setOpen(false)} />}
      {open && <div className="alert-popover" role="dialog" aria-modal="true" aria-label="Central de alertas">
        <div className="popover-title"><strong>Alertas</strong><div className="popover-title-actions"><button onClick={enableNotifications}>Ativar avisos</button><button type="button" className="popover-close" aria-label="Fechar alertas" onClick={() => setOpen(false)}>×</button></div></div>
        {items.length === 0 ? <p className="empty">Nenhum alerta no momento.</p> : items.map((item) => (
          <button type="button" className={`alert-row ${item.level}`} key={`${item.type}-${item.target_id}`} onClick={() => openItem(item)}>
            <strong>{item.title}</strong><span>{item.message}</span><small>{money(item.amount)} • {item.date}</small><em>Abrir lançamento →</em>
          </button>
        ))}
      </div>}
    </div>
  )
}
