import { FormEvent, useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import MoneyInput from '../components/MoneyInput'
import EmptyState from '../components/EmptyState'
import { api, currentMonth, jsonBody, money } from '../services/api'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { Budget, Category, ForecastMonth, Goal, InstallmentCenterItem } from '../types'

function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export default function PlanningPage() {
  const [month, setMonth] = useState(currentMonth())
  const [horizon, setHorizon] = useState(12)
  const [forecast, setForecast] = useState<ForecastMonth[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [installments, setInstallments] = useState<InstallmentCenterItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState('')

  async function load() {
    try {
      const [forecastRows, budgetRows, goalRows, installmentRows, categoryRows] = await Promise.all([
        api<ForecastMonth[]>(`/planning/forecast?months=${horizon}&start=${month}`),
        api<Budget[]>(`/budgets?month=${month}`),
        api<Goal[]>('/goals'),
        api<InstallmentCenterItem[]>('/installments/center'),
        api<Category[]>('/categories?kind=expense'),
      ])
      setForecast(forecastRows); setBudgets(budgetRows); setGoals(goalRows); setInstallments(installmentRows); setCategories(categoryRows.filter(x => x.is_active)); setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar o planejamento.') }
  }

  useEffect(() => { void load() }, [month, horizon])

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try {
      await api('/budgets', { method: 'POST', ...jsonBody({ month, category_id: Number(form.get('category_id')), limit_amount: Number(form.get('limit_amount')) }) })
      event.currentTarget.reset(); await load(); toast.success('Orçamento salvo', 'O limite da categoria foi atualizado.')
    } catch (err) { toast.error('Não foi possível salvar o orçamento', err instanceof Error ? err.message : 'Erro ao salvar') }
  }

  async function removeBudget(id: number) { await api(`/budgets/${id}`, { method: 'DELETE' }); await load() }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    try {
      await api('/goals', { method: 'POST', ...jsonBody({ name: form.get('name'), target_amount: Number(form.get('target_amount')), current_amount: Number(form.get('current_amount') || 0), target_date: form.get('target_date') || null, status: 'active' }) })
      event.currentTarget.reset(); await load(); toast.success('Meta criada', 'A meta financeira já está sendo acompanhada.')
    } catch (err) { toast.error('Não foi possível criar a meta', err instanceof Error ? err.message : 'Erro ao salvar') }
  }

  async function updateGoal(goal: Goal) {
    const value = window.prompt(`Quanto já foi reservado para “${goal.name}”?`, String(goal.current_amount))
    if (value == null) return
    const normalized = Number(value.replace(',', '.'))
    if (!Number.isFinite(normalized) || normalized < 0) return toast.warning('Valor inválido', 'Informe um número igual ou maior que zero.')
    await api(`/goals/${goal.id}`, { method: 'PATCH', ...jsonBody({ ...goal, current_amount: normalized, status: normalized >= goal.target_amount ? 'completed' : 'active' }) })
    await load()
  }

  async function removeGoal(goal: Goal) {
    if (!(await confirmAction({ title: `Excluir meta “${goal.name}”?`, message: 'O acompanhamento desta meta será removido.', confirmLabel: 'Excluir meta', tone: 'danger' }))) return
    await api(`/goals/${goal.id}`, { method: 'DELETE' }); await load()
  }

  const totals = useMemo(() => forecast.reduce((acc, row) => ({ income: acc.income + row.income, expenses: acc.expenses + row.expenses, balance: acc.balance + row.balance }), { income: 0, expenses: 0, balance: 0 }), [forecast])
  const commitment = totals.income ? totals.expenses / totals.income * 100 : 0

  return <>
    <PageHeader title="Planejamento" subtitle="Previsão, orçamentos, metas e parcelas futuras" actions={<div className="planning-header-actions"><input type="month" className="month-input" value={month} onChange={e => setMonth(e.target.value)} /><select value={horizon} onChange={e => setHorizon(Number(e.target.value))}><option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option></select></div>} />
    {error && <div className="form-error">{error}</div>}

    <section className="summary-grid planning-summary">
      <article className="summary-card"><span>Renda no período</span><strong>{money(totals.income)}</strong><small>{horizon} mês(es) projetados</small></article>
      <article className="summary-card"><span>Compromissos</span><strong>{money(totals.expenses)}</strong><small>{commitment.toFixed(0)}% da renda prevista</small></article>
      <article className={`summary-card ${totals.balance < 0 ? 'negative' : 'positive'}`}><span>Sobra projetada</span><strong>{money(totals.balance)}</strong><small>Sem contar novos gastos ainda não cadastrados</small></article>
      <article className="summary-card"><span>Parcelamentos ativos</span><strong>{installments.filter(x => x.pending_installments > 0).length}</strong><small>{money(installments.reduce((sum, x) => sum + x.remaining, 0))} ainda comprometidos</small></article>
    </section>

    <section className="panel planning-forecast-panel"><div className="panel-title-row"><div><h3>Previsão mês a mês</h3><p>Rendas, despesas, cartões e parcelas já cadastradas.</p></div></div>
      <div className="forecast-grid">{forecast.map(row => <article key={row.month} className="forecast-card"><strong>{monthLabel(row.month)}</strong><span>Rendas <b>{money(row.income)}</b></span><span>Despesas <b>{money(row.expenses)}</b></span><span>Cartões <b>{money(row.card_total)}</b></span><span>Parcelas <b>{money(row.installments_total)}</b></span><div className={row.balance < 0 ? 'negative-text' : 'positive-text'}>Saldo {money(row.balance)}</div></article>)}</div>
    </section>

    <section className="planning-two-columns">
      <article className="panel"><h3>Orçamento por categoria</h3><p>Defina quanto pretende gastar em cada categoria em {monthLabel(month)}.</p>
        <form className="inline-finance-form" onSubmit={saveBudget}><select name="category_id" required defaultValue=""><option value="" disabled>Categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><MoneyInput name="limit_amount" required placeholder="Limite" /><button className="primary-button compact">Salvar</button></form>
        <div className="budget-list">{budgets.length === 0 ? <EmptyState text="Nenhum orçamento definido para este mês." /> : budgets.map(item => <div key={item.id} className="budget-row"><div><strong>{item.category_name}</strong><small>{money(item.spent)} de {money(item.limit_amount)}</small><div className="budget-track"><i style={{ width: `${Math.min(100, item.percent)}%` }} /></div></div><b className={item.percent > 100 ? 'negative-text' : ''}>{item.percent.toFixed(0)}%</b><button className="danger-text" onClick={() => removeBudget(item.id)}>Remover</button></div>)}</div>
      </article>

      <article className="panel"><h3>Metas financeiras</h3><p>Separe objetivos do saldo disponível e acompanhe o progresso.</p>
        <form className="goal-form" onSubmit={saveGoal}><input name="name" required placeholder="Ex.: Reserva de emergência" /><MoneyInput name="target_amount" required placeholder="Meta" /><MoneyInput name="current_amount" placeholder="Já guardado" /><input name="target_date" type="date" /><button className="primary-button compact">Criar meta</button></form>
        <div className="goal-list">{goals.length === 0 ? <EmptyState text="Nenhuma meta cadastrada." /> : goals.map(goal => { const pct = goal.target_amount ? Math.min(100, goal.current_amount / goal.target_amount * 100) : 0; return <div key={goal.id} className="goal-row"><div><strong>{goal.name}</strong><small>{money(goal.current_amount)} de {money(goal.target_amount)} {goal.target_date ? `• até ${goal.target_date.split('-').reverse().join('/')}` : ''}</small><div className="budget-track"><i style={{ width: `${pct}%` }} /></div></div><b>{pct.toFixed(0)}%</b><button onClick={() => updateGoal(goal)}>Atualizar</button><button className="danger-text" onClick={() => removeGoal(goal)}>Excluir</button></div> })}</div>
      </article>
    </section>

    <section className="panel installment-center"><h3>Central de parcelamentos</h3><p>Compras parceladas e empréstimos em um único lugar.</p>{installments.length === 0 ? <EmptyState text="Nenhum parcelamento cadastrado." /> : <div className="installment-grid">{installments.map(item => <article key={`${item.kind}-${item.group}`}><span>{item.kind === 'loan' ? 'Empréstimo' : 'Compra parcelada'}</span><strong>{item.name}</strong><small>{item.pending_installments} de {item.total_installments} parcela(s) pendentes</small><b>{money(item.remaining)} restantes</b><small>Último vencimento: {item.last_due.split('-').reverse().join('/')}</small></article>)}</div>}</section>
  </>
}
