import type { ReactNode } from 'react'
import AlertCenter from './AlertCenter'

export default function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="header-actions">{actions}<AlertCenter /></div></header>
}
