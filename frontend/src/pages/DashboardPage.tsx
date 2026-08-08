import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { api, currentMonth, money } from '../services/api'
import type { Category, Dashboard } from '../types'

function clampPercent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, (value / total) * 100))
}

function changeLabel(value?: number | null) {
  if (value === null || value === undefined) return 'Sem comparação'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}% vs. mês anterior`
}

function ProgressSummary({
  title,
  completedLabel,
  pendingLabel,
  completed,
  total,
  tone,
}: {
  title: string
  completedLabel: string
  pendingLabel: string
  completed: number
  total: number
  tone: 'income' | 'expense'
}) {
  const pending = Math.max(0, total - completed)
  const percent = clampPercent(completed, total)

  return <article className={`progress-summary ${tone}`}>
    <div className="progress-summary-head">
      <div>
        <span>{title}</span>
        <strong>{Math.round(percent)}%</strong>
      </div>
      <small>{money(completed)} de {money(total)}</small>
    </div>
    <div className="progress-summary-track"><div className="progress-summary-fill" style={{ width: `${percent}%` }} /></div>
    <div className="progress-summary-values">
      <div><span>{completedLabel}</span><strong>{money(completed)}</strong></div>
      <div><span>{pendingLabel}</span><strong>{money(pending)}</strong></div>
    </div>
  </article>
}

function CategoryBar({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = clampPercent(value, total)
  return <div className="category-progress-row">
    <div className="category-progress-head"><span>{label}</span><strong>{money(value)}</strong></div>
    <div className="category-progress-track"><div className="category-progress-fill" style={{ width: `${Math.max(percent, value > 0 ? 2 : 0)}%` }} /></div>
    <small>{Math.round(percent)}% das despesas do mês</small>
  </div>
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth())
  const [data, setData] = useState<Dashboard | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    Promise.all([
      api<Dashboard>(`/dashboard?month=${month}`),
      api<Category[]>('/categories?kind=expense'),
    ])
      .then(([summary, list]) => {
        setData(summary)
        setCategories(list)
      })
      .catch(err => {
        setData(null)
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o resumo.')
      })
  }, [month])

  const categoryRows = useMemo(() => {
    const names = new Map(categories.map(item => [item.id, item.name]))
    return (data?.by_category || [])
      .map(item => ({
        name: item.category_name || names.get(item.category_id || -1) || 'Sem categoria',
        total: item.total,
      }))
      .sort((a, b) => b.total - a.total)
  }, [data, categories])

  const categoryTotal = categoryRows.reduce((sum, item) => sum + item.total, 0)
  const remainingToPay = Math.max(0, Number(data?.expense_expected || 0) - Number(data?.expense_paid || 0))
  const remainingToReceive = Math.max(0, Number(data?.income_expected || 0) - Number(data?.income_received || 0))

  return <>
    <PageHeader
      title="Visão geral"
      subtitle="Resumo e diagnóstico financeiro do mês selecionado"
      actions={<input className="month-input" type="month" value={month} onChange={e => setMonth(e.target.value)} />}
    />

    {error ? (
      <div className="panel form-error">{error}</div>
    ) : !data ? (
      <div className="panel">Carregando dados...</div>
    ) : <>
      <section className="financial-health panel">
        <div>
          <span className="panel-kicker">Leitura do mês</span>
          <h3>{data.health_message || 'Acompanhe o que entra, sai e já está comprometido.'}</h3>
        </div>
        <div className="health-metrics">
          <span><small>Renda comprometida</small><strong>{Number(data.commitment_percent || 0).toFixed(0)}%</strong></span>
          <span><small>Faturas do mês</small><strong>{money(Number(data.card_total || 0))}</strong></span>
          <span><small>Falta pagar</small><strong>{money(remainingToPay)}</strong></span>
          <span><small>Orçamentos acima</small><strong>{data.budget_over_count || 0}</strong></span>
        </div>
      </section>

      <section className="summary-grid dashboard-section-grid">
        <article className="summary-card">
          <span>Renda prevista</span>
          <strong>{money(data.income_expected)}</strong>
          <small>{changeLabel(data.income_change_percent)}</small>
        </article>
        <article className="summary-card">
          <span>Despesas previstas</span>
          <strong>{money(data.expense_expected)}</strong>
          <small>{changeLabel(data.expense_change_percent)}</small>
        </article>
        <article className={`summary-card ${data.balance_expected < 0 ? 'negative' : 'positive'}`}>
          <span>Saldo previsto</span>
          <strong>{money(data.balance_expected)}</strong>
          <small>Saldo real: {money(data.balance_real)}</small>
        </article>
        <article className="summary-card">
          <span>Pendências</span>
          <strong>{data.pending_expenses}</strong>
          <small>{data.entries} lançamentos no mês</small>
        </article>
      </section>

      <section className="dashboard-insight-grid dashboard-section-grid">
        <article className="panel insight-card">
          <span>Maior categoria</span>
          <strong>{data.largest_category?.category_name || categoryRows[0]?.name || 'Sem dados'}</strong>
          <small>{money(Number(data.largest_category?.total || categoryRows[0]?.total || 0))}</small>
        </article>
        <article className="panel insight-card">
          <span>Próximo vencimento</span>
          <strong>{data.next_due?.description || 'Nenhuma pendência próxima'}</strong>
          <small>{data.next_due ? `${data.next_due.date} • ${money(data.next_due.amount)}` : 'Tudo certo por aqui'}</small>
        </article>
        <article className="panel insight-card">
          <span>Comprometimento</span>
          <strong>{Number(data.commitment_percent || 0).toFixed(1)}%</strong>
          <small>das rendas previstas já destinadas a despesas</small>
        </article>
        <article className="panel insight-card">
          <span>Em aberto</span>
          <strong>{money(remainingToPay)}</strong>
          <small>{remainingToReceive > 0 ? `A receber no mês: ${money(remainingToReceive)}` : 'Tudo que falta pagar já está destacado acima.'}</small>
        </article>
      </section>

      <section className="chart-grid dashboard-progress-grid dashboard-section-grid">
        <article className="panel chart-panel progress-panel">
          <div className="panel-heading-copy">
            <h3>Andamento do mês</h3>
            <p>Quanto já entrou ou foi pago e o que ainda falta.</p>
          </div>
          <div className="progress-summary-list">
            <ProgressSummary title="Recebimento das rendas" completedLabel="Recebido" pendingLabel="A receber" completed={data.income_received} total={data.income_expected} tone="income" />
            <ProgressSummary title="Pagamento das despesas" completedLabel="Pago" pendingLabel="A pagar" completed={data.expense_paid} total={data.expense_expected} tone="expense" />
          </div>
        </article>

        <article className="panel chart-panel dashboard-category-panel">
          <div className="panel-heading-copy">
            <h3>Despesas por categoria</h3>
            <p>Participação de cada categoria no total de {money(categoryTotal)}.</p>
          </div>
          {categoryRows.length
            ? <div className="category-progress-list">{categoryRows.map(item => <CategoryBar key={item.name} label={item.name} value={item.total} total={categoryTotal} />)}</div>
            : <p className="empty">Nenhuma despesa registrada.</p>}
        </article>
      </section>
    </>}
  </>
}
