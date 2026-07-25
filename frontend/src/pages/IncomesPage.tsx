import { FormEvent, useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ModalCard from '../components/ModalCard'
import PageHeader from '../components/PageHeader'
import { api, currentMonth, jsonBody, money, today } from '../services/api'
import { readNavigationTarget, scrollToTarget } from '../services/navigation'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { Account, Category, Income } from '../types'

function payloadFromIncome(item: Income, changes: Partial<Income> = {}) {
  const value = { ...item, ...changes }
  return {
    description: value.description,
    amount_expected: Number(value.amount_expected),
    amount_received: Number(value.amount_received || 0),
    expected_date: value.expected_date,
    received_date: value.status === 'received' ? value.received_date || value.expected_date : null,
    status: value.status,
    account_id: value.account_id ?? null,
    category_id: value.category_id ?? null,
    notes: value.notes || '',
  }
}

export default function IncomesPage() {
  const route = readNavigationTarget('incomes')
  const targetId = route.itemId
  const [month, setMonth] = useState(route.month || currentMonth())
  const [items, setItems] = useState<Income[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [error, setError] = useState('')

  const load = () => Promise.all([api<Income[]>(`/incomes?month=${month}`), api<Account[]>('/accounts'), api<Category[]>('/categories?kind=income')]).then(([a, b, c]) => { setItems(a); setAccounts(b); setCategories(c) }).catch((err) => setError(err.message))
  useEffect(() => { void load() }, [month])
  useEffect(() => {
    if (targetId && items.some((item) => item.id === targetId)) scrollToTarget(`[data-income-id="${targetId}"]`)
  }, [items, targetId])

  function openNew() {
    setEditing(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(item: Income) {
    setEditing(item)
    setError('')
    setShowForm(true)
    window.requestAnimationFrame(() => document.getElementById('income-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const status = String(form.get('status'))
    const expected = Number(form.get('amount_expected'))
    const payload = {
      description: form.get('description'), amount_expected: expected,
      amount_received: status === 'received' ? Number(form.get('amount_received') || expected) : 0,
      expected_date: form.get('expected_date'), received_date: status === 'received' ? form.get('received_date') || form.get('expected_date') : null,
      status, account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
      category_id: form.get('category_id') ? Number(form.get('category_id')) : null, notes: form.get('notes') || ''
    }
    try {
      setError('')
      await api(editing ? `/incomes/${editing.id}` : '/incomes', { method: editing ? 'PATCH' : 'POST', ...jsonBody(payload) })
      const action = editing ? 'Renda atualizada' : 'Renda salva'
      closeForm()
      await load()
      toast.success(action, `${String(payload.description)} foi ${editing ? 'atualizada' : 'adicionada'} com sucesso.`)
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao salvar'; setError(message); toast.error('Não foi possível salvar a renda', message) }
  }

  async function markReceived(item: Income) {
    try {
      setError('')
      await api(`/incomes/${item.id}`, { method: 'PATCH', ...jsonBody(payloadFromIncome(item, { amount_received: item.amount_expected, status: 'received', received_date: today() })) })
      await load()
      toast.success('Recebimento registrado', `${item.description} foi marcada como recebida.`)
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao registrar recebimento'; setError(message); toast.error('Recebimento não registrado', message) }
  }

  async function remove(id: number) {
    const item = items.find((income) => income.id === id)
    const confirmed = await confirmAction({
      title: 'Excluir renda?',
      message: item ? `${item.description} será removida do mês.` : 'Esta renda será removida do mês.',
      detail: 'Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir renda',
      tone: 'danger',
    })
    if (!confirmed) return
    try { await api(`/incomes/${id}`, { method: 'DELETE' }); await load(); toast.success('Renda excluída', 'O lançamento foi removido.') } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao excluir'; setError(message); toast.error('Não foi possível excluir', message) }
  }

  return <>
    <PageHeader title="Rendas" subtitle="Salários, extras e outros recebimentos" actions={<><input className="month-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><button className="primary-button compact" onClick={openNew}>+ Nova renda</button></>} />
    {showForm && <ModalCard onClose={closeForm} label={editing ? `Editar renda ${editing.description}` : 'Nova renda'} wide><form id="income-form" key={editing?.id || 'new-income'} className="panel form-grid modal-form" onSubmit={submit}>
      <h3 className="form-title wide">{editing ? 'Editar salário ou renda' : 'Nova renda'}</h3>
      <label className="wide">Descrição<input name="description" required defaultValue={editing?.description || ''} /></label>
      <label>Valor previsto<input name="amount_expected" type="number" step="0.01" min="0" required defaultValue={editing ? Number(editing.amount_expected) : ''} /></label>
      <label>Valor recebido<input name="amount_received" type="number" step="0.01" min="0" defaultValue={editing ? Number(editing.amount_received) : ''} /></label>
      <label>Data prevista<input name="expected_date" type="date" defaultValue={editing?.expected_date || `${month}-01`} required /></label>
      <label>Data recebida<input name="received_date" type="date" defaultValue={editing?.received_date || ''} /></label>
      <label>Situação<select name="status" defaultValue={editing?.status || 'pending'}><option value="pending">Pendente</option><option value="received">Recebida</option></select></label>
      <label>Categoria<select name="category_id" defaultValue={editing?.category_id || ''}><option value="">Sem categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Conta de destino<select name="account_id" defaultValue={editing?.account_id || ''}><option value="">Não informada</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="wide">Observações<textarea name="notes" rows={2} defaultValue={editing?.notes || ''} /></label>
      <div className="form-actions"><button className="primary-button">{editing ? 'Salvar alterações' : 'Salvar'}</button><button type="button" className="secondary-button" onClick={closeForm}>Cancelar</button></div>
    </form></ModalCard>}
    {error && <div className="form-error">{error}</div>}
    <section className="table-panel incomes-table"><table><thead><tr><th>Descrição</th><th>Data</th><th>Previsto</th><th>Recebido</th><th>Status</th><th className="income-actions-heading">Ações</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} data-income-id={item.id} tabIndex={-1} className={targetId === item.id ? 'target-row' : ''}><td><strong>{item.description}</strong></td><td>{item.expected_date}</td><td>{money(Number(item.amount_expected))}</td><td>{money(Number(item.amount_received))}</td><td><span className={`status ${item.status}`}>{item.status === 'received' ? 'Recebida' : 'Pendente'}</span></td><td className="income-actions-cell"><div className="row-actions income-row-actions">{item.status !== 'received' && <button onClick={() => markReceived(item)}>Receber</button>}<button onClick={() => openEdit(item)}>Editar</button><button className="danger-text" onClick={() => remove(item.id)}>Excluir</button></div></td></tr>)}</tbody></table>{items.length === 0 && <EmptyState text="Nenhuma renda neste mês." />}</section>
  </>
}
