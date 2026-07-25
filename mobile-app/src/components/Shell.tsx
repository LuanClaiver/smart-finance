import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '../types'

type Props = {
  user: User
  active: string
  ownerUsers: User[]
  ownerId: number
  onOwnerChange: (ownerId: number) => void
  onNavigate: (page: string) => void
  onLogout: () => void
  children: ReactNode
}

const baseItems = [
  ['dashboard', '◫', 'Visão geral'],
  ['incomes', '+', 'Rendas'],
  ['expenses', '−', 'Despesas'],
  ['accounts', '▣', 'Contas'],
  ['cards', '▤', 'Cartões'],
  ['loans', '↗', 'Empréstimos'],
  ['reports', '▧', 'Relatório PDF'],
  ['settings', '⚙', 'Configurações'],
]

export default function Shell({ user, active, ownerUsers, ownerId, onOwnerChange, onNavigate, onLogout, children }: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const items = user.role === 'admin' ? [...baseItems.slice(0, 7), ['admin', '♟', 'Usuários'], baseItems[7]] : baseItems
  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMoreOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [moreOpen])

  const navigate = (page: string) => { setMoreOpen(false); onNavigate(page) }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">▥</span><div><strong>Smart Finance</strong><small>Controle financeiro local</small></div></div>
        {user.role === 'admin' && <label className="owner-selector">Dados exibidos<select value={ownerId} onChange={(event) => onOwnerChange(Number(event.target.value))}>{ownerUsers.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label>}
        <nav>
          {items.map(([id, icon, label]) => (
            <button key={id} className={active === id ? 'nav-item active' : 'nav-item'} onClick={() => navigate(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user.display_name.slice(0, 1).toUpperCase()}</div>
          <div><strong>{user.display_name}</strong><small>{user.role === 'admin' ? 'Administrador' : user.username}</small></div>
          <button className="icon-button" title="Sair" onClick={onLogout}>↪</button>
        </div>
      </aside>
      <main className="main-content">
        {user.role === 'admin' && <div className="mobile-owner-bar"><span>Visualizando:</span><select value={ownerId} onChange={(event) => onOwnerChange(Number(event.target.value))}>{ownerUsers.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></div>}
        {children}
      </main>
      <nav className="mobile-nav">
        {items.slice(0, 5).map(([id, icon, label]) => (
          <button key={id} className={active === id ? 'active' : ''} onClick={() => navigate(id)}><span>{icon}</span><small>{label}</small></button>
        ))}
        <button className={moreOpen ? 'active' : ''} onClick={() => setMoreOpen(!moreOpen)}><span>•••</span><small>Mais</small></button>
      </nav>
      {moreOpen && <div className="mobile-more-menu" ref={moreRef}>{items.slice(5).map(([id, icon, label]) => <button key={id} className={active === id ? 'active' : ''} onClick={() => navigate(id)}><span>{icon}</span>{label}</button>)}<button onClick={onLogout}><span>↪</span>Sair</button></div>}
    </div>
  )
}
