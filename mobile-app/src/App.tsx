import { useEffect, useState } from 'react'
import Shell from './components/Shell'
import MobileLockGate from './components/MobileLockGate'
import { api, setSelectedOwnerId, setToken } from './services/api'
import { navigateTo, readNavigationTarget } from './services/navigation'
import { toast } from './services/toast'
import { applyTheme, getInitialTheme, type AppTheme } from './services/theme'
import type { User } from './types'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import IncomesPage from './pages/IncomesPage'
import ExpensesPage from './pages/ExpensesPage'
import AccountsPage from './pages/AccountsPage'
import CardsPage from './pages/CardsPage'
import LoansPage from './pages/LoansPage'
import ReportsPage from './pages/ReportsPage'
import PlanningPage from './pages/PlanningPage'
import ImportPage from './pages/ImportPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const initialRoute = readNavigationTarget()
  const [user, setUser] = useState<User | null>(null)
  const [ownerUsers, setOwnerUsers] = useState<User[]>([])
  const [ownerId, setOwnerId] = useState(0)
  const [page, setPage] = useState(initialRoute.page)
  const [loading, setLoading] = useState(true)
  const [ownerVersion, setOwnerVersion] = useState(0)
  const [routeVersion, setRouteVersion] = useState(0)
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme)

  async function configureUser(current: User) {
    // Define primeiro qual banco de usuário a API deve consultar. Assim, a página
    // nunca faz uma primeira leitura com o proprietário anterior salvo no navegador.
    if (current.role === 'admin') {
      const users = await api<User[]>('/admin/users')
      const stored = Number(localStorage.getItem('smart-finance-owner-id'))
      const selected = users.some((item) => item.id === stored) ? stored : current.id
      setSelectedOwnerId(selected)
      setOwnerUsers(users)
      setOwnerId(selected)
    } else {
      setSelectedOwnerId(null)
      setOwnerUsers([current])
      setOwnerId(current.id)
    }
    setUser(current)
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const syncRoute = () => {
      const route = readNavigationTarget()
      setPage(route.page)
      setRouteVersion((value) => value + 1)
    }
    if (!window.location.hash) navigateTo('dashboard')
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  useEffect(() => {
    api<User>('/auth/me').then(configureUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  function changeOwner(id: number) {
    setOwnerId(id)
    setSelectedOwnerId(id)
    setOwnerVersion((value) => value + 1)
  }

  function navigate(pageName: string) {
    navigateTo(pageName)
    setPage(pageName)
  }

  function logout() {
    setToken(null)
    setSelectedOwnerId(null)
    setUser(null)
    setOwnerUsers([])
    setOwnerId(0)
    navigateTo('dashboard')
    setPage('dashboard')
    toast.info('Sessão encerrada', 'Você saiu do Smart Finance.')
  }

  if (loading) return <div className="splash"><div className="hero-logo"><img src="/icon.svg" alt="" /></div><strong>Smart Finance</strong></div>
  if (!user) return <AuthPage onAuthenticated={configureUser} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />

  const pageKey = `${page}-${ownerVersion}-${routeVersion}`
  const content = page === 'dashboard' ? <DashboardPage key={pageKey} />
    : page === 'incomes' ? <IncomesPage key={pageKey} />
    : page === 'expenses' ? <ExpensesPage key={pageKey} />
    : page === 'accounts' ? <AccountsPage key={pageKey} />
    : page === 'cards' ? <CardsPage key={pageKey} />
    : page === 'loans' ? <LoansPage key={pageKey} />
    : page === 'planning' ? <PlanningPage key={pageKey} />
    : page === 'import' ? <ImportPage key={pageKey} />
    : page === 'reports' ? <ReportsPage key={pageKey} />
    : page === 'admin' && user.role === 'admin' ? <AdminPage key={pageKey} currentUser={user} />
    : <SettingsPage key={pageKey} user={user} onUser={configureUser} />

  return <MobileLockGate><Shell user={user} active={page} ownerUsers={ownerUsers} ownerId={ownerId} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} onOwnerChange={changeOwner} onNavigate={navigate} onLogout={logout}>{content}</Shell></MobileLockGate>
}
