import { FormEvent, useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ModalCard from '../components/ModalCard'
import PageHeader from '../components/PageHeader'
import MoneyInput from '../components/MoneyInput'
import ReceiptScanButton from '../components/ReceiptScanButton'
import { api, currentMonth, jsonBody, money, today } from '../services/api'
import { readNavigationTarget, scrollToTarget } from '../services/navigation'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { Account, Category, Income } from '../types'
import type { ReceiptDraft } from '../services/mobile/receiptScanner'

function payloadFromIncome(item: Income, changes: Partial<Income> = {}) {
  const value = { ...item, ...changes }
  return {
    description: value.description, amount_expected: Number(value.amount_expected), amount_received: Number(value.amount_received || 0),
    expected_date: value.expected_date, received_date: value.status === 'received' ? value.received_date || today() : null,
    status: value.status, account_id: value.account_id ?? null, category_id: value.category_id ?? null, notes: value.notes || '', external_id: value.external_id || null,
  }
}

function normalizedCategoryName(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() }
function categoryIdFromHint(categories: Category[], hint: string): number | '' { if (!hint) return ''; const normalizedHint = normalizedCategoryName(hint); const match = categories.find((item) => { const name = normalizedCategoryName(item.name); return name === normalizedHint || name.includes(normalizedHint) || normalizedHint.includes(name) }); return match?.id || '' }

export default function IncomesPage() {
  const route = readNavigationTarget('incomes')
  const targetId = route.itemId
  const [month, setMonth] = useState(route.month || currentMonth())
  const [items, setItems] = useState<Income[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [recurring, setRecurring] = useState(false)
  const [scanDraft, setScanDraft] = useState<ReceiptDraft | null>(null)
  const [scanVersion, setScanVersion] = useState(0)
  const [error, setError] = useState('')
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const load = () => Promise.all([api<Income[]>(`/incomes?month=${month}`), api<Account[]>('/accounts'), api<Category[]>('/categories?kind=income')])
    .then(([incomeItems, accountItems, categoryItems]) => { setItems(incomeItems); setAccounts(accountItems); setCategories(categoryItems); setError('') })
    .catch((err) => setError(err.message))

  useEffect(() => { void load() }, [month])
  useEffect(() => { if (targetId && items.some((item) => item.id === targetId)) scrollToTarget(`[data-income-id="${targetId}"]`) }, [items, targetId])

  function openNew() { setEditing(null); setRecurring(false); setScanDraft(null); setScanVersion((current) => current + 1); setError(''); setShowForm(true) }
  function openFromReceipt(draft: ReceiptDraft) { setEditing(null); setRecurring(false); setScanDraft(draft); setScanVersion((current) => current + 1); setError(''); setShowForm(true) }
  function openEdit(item: Income) { setEditing(item); setRecurring(Boolean(item.recurrence_id)); setScanDraft(null); setScanVersion((current) => current + 1); setError(''); setShowForm(true); window.requestAnimationFrame(() => document.getElementById('income-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
  function closeForm() { setShowForm(false); setEditing(null); setRecurring(false); setScanDraft(null); }

  async function stopRecurrence(item: Income) {
    if (!item.recurrence_id) return
    const confirmed = await confirmAction({ title: 'Parar renda recorrente?', message: 'Os próximos lançamentos pendentes desta renda deixarão de ser gerados.', detail: 'O mês atual e rendas já recebidas são preservados.', confirmLabel: 'Parar recorrência', tone: 'warning' })
    if (!confirmed) return
    try {
      const result = await api<{ removed: number }>(`/recurring-incomes/${item.recurrence_id}/stop?from_month=${month}&remove_future=true`, { method: 'POST' })
      toast.success('Recorrência desativada', `${result.removed || 0} lançamento(s) futuro(s) pendente(s) foram removidos.`)
      if (editing?.id === item.id) { setRecurring(false); setEditing({ ...item, recurrence_id: undefined }) }
      await load()
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao parar recorrência'; setError(message); toast.error('Não foi possível parar a recorrência', message) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    const status = editing?.status || (scanDraft ? 'received' : 'pending')
    const expectedDate = String(form.get('expected_date'))
    const payload = {
      description: form.get('description'), amount_expected: amount, amount_received: status === 'received' ? amount : 0,
      expected_date: expectedDate, received_date: status === 'received' ? editing?.received_date || scanDraft?.documentDate || today() : null,
      status, account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
      category_id: form.get('category_id') ? Number(form.get('category_id')) : null, notes: form.get('notes') || '',
      external_id: editing?.external_id || null,
    }
    try {
      setError('')
      if (!editing && recurring) {
        const result = await api<{ generated: number }>('/recurring-incomes', { method: 'POST', ...jsonBody({
          description: payload.description, amount, expected_day: Number(expectedDate.slice(8, 10)), category_id: payload.category_id,
          account_id: payload.account_id, notes: payload.notes, start_month: expectedDate.slice(0, 7), end_month: form.get('end_month') || null,
          months_to_generate: Number(form.get('months_to_generate') || 24), active: true,
        }) })
        closeForm(); await load(); toast.success('Renda recorrente criada', `${result.generated || 0} lançamento(s) mensal(is) foram gerados.`); return
      }
      await api(editing ? `/incomes/${editing.id}` : '/incomes', { method: editing ? 'PATCH' : 'POST', ...jsonBody(payload) })
      if (editing?.recurrence_id && !recurring) {
        await api(`/recurring-incomes/${editing.recurrence_id}/stop?from_month=${month}&remove_future=true`, { method: 'POST' })
        toast.success('Recorrência desativada', 'Os próximos lançamentos pendentes foram removidos.')
      }
      const action = editing ? 'Renda atualizada' : 'Renda salva'; closeForm(); await load(); toast.success(action, `${String(payload.description)} foi ${editing ? 'atualizada' : 'adicionada'} com sucesso.`)
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao salvar'; setError(message); toast.error('Não foi possível salvar a renda', message) }
  }

  async function markReceived(item: Income) {
    try { setError(''); await api(`/incomes/${item.id}`, { method: 'PATCH', ...jsonBody(payloadFromIncome(item, { amount_received: item.amount_expected, status: 'received', received_date: today() })) }); await load(); toast.success('Recebimento registrado', `${item.description} foi marcada como recebida.`) }
    catch (err) { const message = err instanceof Error ? err.message : 'Erro ao registrar recebimento'; setError(message); toast.error('Recebimento não registrado', message) }
  }

  async function remove(id: number) {
    const item = items.find((income) => income.id === id)
    const confirmed = await confirmAction({ title: 'Excluir renda?', message: item ? `${item.description} será removida do mês.` : 'Esta renda será removida do mês.', detail: item?.recurrence_id ? 'Isso exclui apenas esta ocorrência. Para remover os próximos meses, use “Parar recorrência”.' : 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir renda', tone: 'danger' })
    if (!confirmed) return
    try { await api(`/incomes/${id}`, { method: 'DELETE' }); await load(); toast.success('Renda excluída', 'O lançamento foi removido.') }
    catch (err) { const message = err instanceof Error ? err.message : 'Erro ao excluir'; setError(message); toast.error('Não foi possível excluir', message) }
  }

  const normalizedFilter = filterText.trim().toLocaleLowerCase('pt-BR')
  const filteredItems = items.filter((item) => {
    if (normalizedFilter && !`${item.description} ${item.notes || ''}`.toLocaleLowerCase('pt-BR').includes(normalizedFilter)) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (filterCategory !== 'all' && String(item.category_id || '') !== filterCategory) return false
    return true
  })

  return <>
    <PageHeader title="Rendas" subtitle="Salários, extras e recebimentos recorrentes" actions={<><input className="month-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><ReceiptScanButton kind="income" onScanned={(draft) => openFromReceipt(draft)} /><button className="primary-button compact" onClick={openNew}>+ Nova renda</button></>} />

    {showForm && <ModalCard onClose={closeForm} label={editing ? `Editar renda ${editing.description}` : 'Nova renda'} wide>
      <form id="income-form" key={editing?.id || `new-income-${scanVersion}`} className="panel form-grid modal-form" onSubmit={submit}>
        <h3 className="form-title wide">{editing ? 'Editar salário ou renda' : 'Nova renda'}</h3>
        {scanDraft && <div className="receipt-scan-note wide"><strong>✓ Entrada preenchida pela câmera</strong><span>Revise os dados antes de salvar. O lançamento será registrado como recebido.</span></div>}
        {!editing && <label className="toggle-line wide"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Renda recorrente mensal</label>}
        {editing?.recurrence_id && <div className="recurrence-control wide"><label className="toggle-line"><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} /> Manter renda recorrente</label><small>Desmarque e salve para interromper os próximos lançamentos pendentes.</small></div>}
        <label className="wide">Descrição<input name="description" required defaultValue={editing?.description || scanDraft?.description || ''} /></label>
        <label>Valor<MoneyInput name="amount" required defaultValue={editing ? Number(editing.amount_expected) : scanDraft?.amount ?? ''} /></label>
        <label>Data prevista<input name="expected_date" type="date" defaultValue={editing?.expected_date || scanDraft?.documentDate || `${month}-01`} required /></label>
        <label>Categoria<select name="category_id" defaultValue={editing?.category_id || categoryIdFromHint(categories, scanDraft?.categoryHint || '')}><option value="">Sem categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Conta de destino<select name="account_id" defaultValue={editing?.account_id || ''}><option value="">Não informada</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {recurring && !editing && <><label>Gerar por<select name="months_to_generate" defaultValue="24"><option value="12">12 meses</option><option value="24">24 meses</option><option value="36">36 meses</option><option value="60">60 meses</option></select></label><label>Final opcional<input type="month" name="end_month" min={month} /></label></>}
        <label className="wide">Observações<textarea name="notes" rows={2} defaultValue={editing?.notes || scanDraft?.notes || ''} /></label>
        {editing?.status === 'received' && <p className="income-received-note wide">Esta renda já foi recebida em {editing.received_date || 'data não informada'}.</p>}
        <div className="form-actions"><button className="primary-button">{editing ? 'Salvar alterações' : 'Salvar'}</button><button type="button" className="secondary-button" onClick={closeForm}>Cancelar</button>{editing?.recurrence_id && <button type="button" className="danger-button" onClick={() => stopRecurrence(editing)}>Parar recorrência</button>}</div>
      </form>
    </ModalCard>}

    {error && <div className="form-error">{error}</div>}
    <div className="advanced-filters panel" aria-label="Filtros avançados de rendas">
      <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Buscar renda ou observação" />
      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">Todos os status</option><option value="pending">Pendentes</option><option value="received">Recebidas</option></select>
      <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select>
      {(filterText || filterStatus !== 'all' || filterCategory !== 'all') && <button type="button" className="secondary-button compact" onClick={() => { setFilterText(''); setFilterStatus('all'); setFilterCategory('all') }}>Limpar filtros</button>}
    </div>
    <section className="table-panel incomes-table"><table><thead><tr><th>Descrição</th><th>Data prevista</th><th>Valor</th><th>Status</th><th className="income-actions-heading">Ações</th></tr></thead><tbody>{filteredItems.map((item) => <tr key={item.id} data-income-id={item.id} tabIndex={-1} className={targetId === item.id ? 'target-row' : ''}>
      <td><strong>{item.description}</strong>{item.recurrence_id && <small className="recurrence-badge">↻ Recorrente</small>}</td><td>{item.expected_date}</td><td>{money(Number(item.amount_expected))}</td><td><span className={`status ${item.status}`}>{item.status === 'received' ? 'Recebida' : 'Pendente'}</span></td>
      <td className="income-actions-cell"><div className="row-actions income-row-actions">{item.status !== 'received' && <button onClick={() => markReceived(item)}>Receber</button>}<button onClick={() => openEdit(item)}>Editar</button>{item.recurrence_id && <button onClick={() => stopRecurrence(item)}>Parar recorrência</button>}<button className="danger-text" onClick={() => remove(item.id)}>Excluir</button></div></td>
    </tr>)}</tbody></table>{filteredItems.length === 0 && <EmptyState text={items.length ? "Nenhuma renda corresponde aos filtros." : "Nenhuma renda neste mês."} />}</section>
  </>
}
