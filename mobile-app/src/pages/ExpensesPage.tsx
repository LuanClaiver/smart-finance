import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ModalCard from '../components/ModalCard'
import PageHeader from '../components/PageHeader'
import MoneyInput from '../components/MoneyInput'
import ReceiptScanButton from '../components/ReceiptScanButton'
import { api, currentMonth, jsonBody, money, today } from '../services/api'
import { confirmAction } from '../services/confirm'
import { readNavigationTarget, scrollToTarget } from '../services/navigation'
import { toast } from '../services/toast'
import type { Account, Card, Category, Expense } from '../types'
import type { ReceiptDraft } from '../services/mobile/receiptScanner'

function payloadFromExpense(item: Expense, changes: Partial<Expense> = {}) {
  const value = { ...item, ...changes }
  return {
    description: value.description,
    amount: Number(value.amount),
    purchase_date: value.purchase_date,
    due_date: value.due_date,
    paid_date: value.status === 'paid' ? value.paid_date || value.due_date : null,
    category_id: value.category_id ?? null,
    expense_type: value.expense_type || 'variable',
    payment_method: value.payment_method || 'pix',
    merchant: value.merchant || '',
    notes: value.notes || '',
    status: value.status,
    account_id: value.account_id ?? null,
    card_id: value.card_id ?? null,
    installments: 1,
    list_month: value.due_date?.slice(0, 7) || value.list_month || value.billing_month,
    external_id: value.external_id || null,
  }
}


function expenseDescription(item: Expense): string {
  if (!item.card_id) return item.description
  return item.description
    .replace(/^Fatura\s+do\s+(?=Cart[aã]o\b)/i, '')
    .replace(/^Fatura\s+(?=Cart[aã]o\b)/i, '')
    .trim()
}

function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function mergeExpenses(current: Expense[], incoming: Expense[]): Expense[] {
  const incomingIds = new Set(incoming.map((item) => item.id))
  return [...incoming, ...current.filter((item) => !incomingIds.has(item.id))]
}

function expenseDeadlineClass(item: Expense): string {
  if (item.status === 'paid') return 'expense-deadline-paid'
  if (!item.due_date) return ''
  const [year, month, day] = item.due_date.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const now = new Date()
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const difference = Math.round((due.getTime() - todayLocal.getTime()) / 86_400_000)
  if (difference < 0) return 'expense-deadline-overdue'
  if (difference <= 7) return 'expense-deadline-soon'
  return ''
}

function expenseDeadlineTitle(item: Expense): string {
  const state = expenseDeadlineClass(item)
  if (state === 'expense-deadline-paid') return 'Despesa paga'
  if (state === 'expense-deadline-overdue') return 'Despesa vencida'
  if (state === 'expense-deadline-soon') return 'Vencimento próximo'
  return ''
}


function paymentMethodLabel(value: string): string {
  const labels: Record<string, string> = {
    pix: 'Pix', debit: 'Débito', cash: 'Dinheiro', transfer: 'Transferência', boleto: 'Boleto', credit_card: 'Cartão de crédito',
  }
  return labels[value] || value || 'Não informada'
}

function formatDate(value?: string): string {
  if (!value) return 'Não informada'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function normalizedCategoryName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function categoryIdFromHint(categories: Category[], hint: string): number | '' {
  if (!hint) return ''
  const normalizedHint = normalizedCategoryName(hint)
  const match = categories.find((item) => {
    const name = normalizedCategoryName(item.name)
    return name === normalizedHint || name.includes(normalizedHint) || normalizedHint.includes(name)
  })
  return match?.id || ''
}

export default function ExpensesPage() {
  const route = readNavigationTarget('expenses')
  const targetId = route.itemId
  const [month, setMonth] = useState(route.month || currentMonth())
  const [items, setItems] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [fixed, setFixed] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [expenseStatus, setExpenseStatus] = useState('pending')
  const [paidDate, setPaidDate] = useState('')
  const [editing, setEditing] = useState<Expense | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentLoading, setAttachmentLoading] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')
  const [fullscreenAttachment, setFullscreenAttachment] = useState(false)
  const [error, setError] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [scanDraft, setScanDraft] = useState<ReceiptDraft | null>(null)
  const [scanVersion, setScanVersion] = useState(0)
  const [scannedReceiptFile, setScannedReceiptFile] = useState<File | null>(null)
  const requestVersion = useRef(0)

  const loadExpenses = useCallback(async (selectedMonth: string) => {
    const request = ++requestVersion.current
    setLoadingItems(true)
    try {
      // O marcador refresh e cache=no-store impedem que o navegador reutilize uma
      // resposta anterior. O contador evita que uma requisição lenta de outro mês
      // sobrescreva a lista mais recente.
      const data = await api<Expense[]>(`/expenses?month=${encodeURIComponent(selectedMonth)}&refresh=${Date.now()}`, { cache: 'no-store' })
      if (request === requestVersion.current) {
        setItems(data)
        setError('')
      }
    } catch (err) {
      if (request === requestVersion.current) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar despesas'
        setError(message)
        toast.error('Não foi possível atualizar as despesas', message)
      }
    } finally {
      if (request === requestVersion.current) setLoadingItems(false)
    }
  }, [])

  const loadLookups = useCallback(async () => {
    const results = await Promise.allSettled([
      api<Account[]>('/accounts', { cache: 'no-store' }),
      api<Card[]>('/cards', { cache: 'no-store' }),
      api<Category[]>('/categories?kind=expense', { cache: 'no-store' }),
    ])
    if (results[0].status === 'fulfilled') setAccounts(results[0].value)
    if (results[1].status === 'fulfilled') setCards(results[1].value)
    if (results[2].status === 'fulfilled') setCategories(results[2].value)
    const failure = results.find((result) => result.status === 'rejected')
    if (failure?.status === 'rejected') setError(failure.reason instanceof Error ? failure.reason.message : 'Erro ao carregar opções do formulário')
  }, [])


  useEffect(() => {
    setItems([])
    void loadExpenses(month)
  }, [month, loadExpenses])

  useEffect(() => { void loadLookups() }, [loadLookups])

  useEffect(() => {
    if (fixed && paymentMethod === 'credit_card') setPaymentMethod('pix')
  }, [fixed, paymentMethod])

  useEffect(() => {
    const refresh = () => void loadExpenses(month)
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [month, loadExpenses])

  useEffect(() => {
    if (targetId && items.some((item) => item.id === targetId)) scrollToTarget(`[data-expense-id="${targetId}"]`)
  }, [items, targetId])


  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    setAttachmentUrl('')
    setAttachmentError('')
    setFullscreenAttachment(false)
    if (!selectedExpense?.attachment_path) {
      setAttachmentLoading(false)
      return () => undefined
    }
    setAttachmentLoading(true)
    api<Blob>(`/expenses/${selectedExpense.id}/attachment`, { cache: 'no-store' })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setAttachmentUrl(objectUrl)
      })
      .catch((err) => {
        if (!cancelled) setAttachmentError(err instanceof Error ? err.message : 'Não foi possível abrir o comprovante.')
      })
      .finally(() => { if (!cancelled) setAttachmentLoading(false) })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [selectedExpense?.id, selectedExpense?.attachment_path])

  useEffect(() => {
    if (!fullscreenAttachment) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFullscreenAttachment(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [fullscreenAttachment])

  function openNew() {
    setEditing(null)
    setFixed(false)
    setPaymentMethod('pix')
    setExpenseStatus('pending')
    setPaidDate('')
    setScanDraft(null)
    setScannedReceiptFile(null)
    setScanVersion((current) => current + 1)
    setError('')
    setShowForm(true)
  }

  function openFromReceipt(draft: ReceiptDraft, file: File) {
    setEditing(null)
    setFixed(false)
    setPaymentMethod(draft.paymentMethod || 'pix')
    const shouldMarkPaid = draft.paymentMethod !== 'credit_card' && draft.isLikelyPaid
    setExpenseStatus(shouldMarkPaid ? 'paid' : 'pending')
    setPaidDate(shouldMarkPaid ? draft.documentDate || today() : '')
    setScanDraft(draft)
    setScannedReceiptFile(file)
    setScanVersion((current) => current + 1)
    setError('')
    setShowForm(true)
    window.requestAnimationFrame(() => document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function openEdit(item: Expense) {
    setEditing(item)
    setFixed(false)
    setScanDraft(null)
    setScannedReceiptFile(null)
    setScanVersion((current) => current + 1)
    setPaymentMethod(item.card_id ? 'credit_card' : item.payment_method || 'pix')
    setExpenseStatus(item.status || 'pending')
    setPaidDate(item.paid_date || '')
    setError('')
    setShowForm(true)
    window.requestAnimationFrame(() => document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setFixed(false)
    setExpenseStatus('pending')
    setPaidDate('')
    setScanDraft(null)
    setScannedReceiptFile(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const usesCard = paymentMethod === 'credit_card'
    const purchaseDate = usesCard
      ? String(form.get('purchase_date') || editing?.purchase_date || today())
      : String(editing?.purchase_date || scanDraft?.documentDate || today())
    const dueDate = String(form.get('due_date') || editing?.due_date || scanDraft?.documentDate || `${month}-10`)
    const normalizedStatus = paidDate ? 'paid' : expenseStatus
    const normalizedPaidDate = normalizedStatus === 'paid' ? (paidDate || today()) : null
    try {
      setError('')
      if (editing) {
        const cardId = usesCard && form.get('card_id') ? Number(form.get('card_id')) : null
        const updated = await api<Expense>(`/expenses/${editing.id}`, { method: 'PATCH', ...jsonBody({
          description: form.get('description'), amount: Number(form.get('amount')), purchase_date: purchaseDate,
          due_date: dueDate, paid_date: normalizedPaidDate,
          category_id: form.get('category_id') ? Number(form.get('category_id')) : null, expense_type: editing.expense_type || 'variable',
          payment_method: cardId ? 'credit_card' : paymentMethod, merchant: form.get('merchant') || '', notes: form.get('notes') || '',
          status: normalizedStatus, account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
          card_id: cardId, installments: 1, list_month: dueDate.slice(0, 7),
        }) })
        if (editing.recurrence_id && !fixed) {
          await api(`/recurring-expenses/${editing.recurrence_id}/stop?from_month=${month}&remove_future=true`, { method: 'POST' })
        }
        setItems((current) => current.map((item) => item.id === updated.id ? updated : item))
        closeForm()
        await loadExpenses(month)
        toast.success('Despesa atualizada', updated.list_month !== month ? `${updated.description} agora aparece em ${monthLabel(updated.list_month)}, mês do vencimento.` : `${updated.description} foi atualizada.`)
      } else if (fixed) {
        const result = await api<{ generated: number }>('/recurring-expenses', { method: 'POST', ...jsonBody({
          description: form.get('description'), amount: Number(form.get('amount')), due_day: Number(form.get('due_day')),
          category_id: form.get('category_id') ? Number(form.get('category_id')) : null, payment_method: paymentMethod,
          merchant: form.get('merchant') || '', account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
          start_month: month, end_month: form.get('end_month') || null, months_to_generate: Number(form.get('months_to_generate') || 12),
        }) })
        closeForm()
        await loadExpenses(month)
        toast.success('Gasto fixo criado', `${result.generated || 0} lançamento(s) mensal(is) foram gerados.`)
      } else {
        const cardId = usesCard && form.get('card_id') ? Number(form.get('card_id')) : null
        const created = await api<Expense[]>('/expenses', { method: 'POST', ...jsonBody({
          description: form.get('description'), amount: Number(form.get('amount')), purchase_date: purchaseDate,
          due_date: dueDate, paid_date: normalizedPaidDate,
          category_id: form.get('category_id') ? Number(form.get('category_id')) : null, expense_type: 'variable',
          payment_method: cardId ? 'credit_card' : paymentMethod, merchant: form.get('merchant') || '', notes: form.get('notes') || '',
          status: normalizedStatus, account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
          card_id: cardId, installments: Number(form.get('installments') || 1), list_month: dueDate.slice(0, 7),
        }) })
        const visibleNow = created.filter((item) => item.list_month === month)
        setItems((current) => mergeExpenses(current, visibleNow))
        const first = created[0]
        const receiptToAttach = scannedReceiptFile
        if (first && receiptToAttach) await uploadAttachment(first.id, receiptToAttach)
        closeForm()
        await loadExpenses(month)
        const targetMonth = first?.list_month || month
        const dueMonthMessage = targetMonth !== month
          ? ` Como o vencimento é em ${monthLabel(targetMonth)}, o lançamento foi enviado para esse mês.`
          : ` O lançamento aparece em ${monthLabel(targetMonth)}.`
        toast.success('Despesa salva', `${created.length} lançamento(s) adicionado(s).${dueMonthMessage}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar'
      setError(message)
      toast.error('Não foi possível salvar a despesa', message)
    }
  }

  async function stopRecurrence(item: Expense) {
    if (!item.recurrence_id) return
    const confirmed = await confirmAction({
      title: 'Parar despesa recorrente?',
      message: 'Os próximos lançamentos pendentes desta despesa serão removidos.',
      detail: 'O mês atual e despesas já pagas são preservados. Você pode continuar editando apenas esta ocorrência.',
      confirmLabel: 'Parar recorrência',
      tone: 'warning',
    })
    if (!confirmed) return
    try {
      const result = await api<{ removed: number }>(`/recurring-expenses/${item.recurrence_id}/stop?from_month=${month}&remove_future=true`, { method: 'POST' })
      setFixed(false)
      if (editing?.id === item.id) setEditing({ ...item, recurrence_id: undefined })
      await loadExpenses(month)
      toast.success('Recorrência desativada', `${result.removed || 0} lançamento(s) futuro(s) pendente(s) foram removidos.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao parar recorrência'
      setError(message)
      toast.error('Não foi possível parar a recorrência', message)
    }
  }

  async function markPaid(item: Expense) {
    try {
      setError('')
      const updated = await api<Expense>(`/expenses/${item.id}`, { method: 'PATCH', ...jsonBody(payloadFromExpense(item, { status: 'paid', paid_date: today() })) })
      setItems((current) => current.map((expense) => expense.id === updated.id ? updated : expense))
      setSelectedExpense((current) => current?.id === updated.id ? updated : current)
      await loadExpenses(month)
      toast.success('Pagamento registrado', `${item.description} foi marcada como paga.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar pagamento'
      setError(message)
      toast.error('Pagamento não registrado', message)
    }
  }

  async function remove(id: number) {
    const item = items.find((expense) => expense.id === id)
    const confirmed = await confirmAction({
      title: 'Excluir despesa?',
      message: item ? `${item.description} será removida da lista.` : 'Esta despesa será removida da lista.',
      detail: 'O comprovante vinculado e os dados deste lançamento também deixarão de aparecer no sistema.',
      confirmLabel: 'Excluir despesa',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      await api(`/expenses/${id}`, { method: 'DELETE' })
      setItems((current) => current.filter((expense) => expense.id !== id))
      if (selectedExpense?.id === id) setSelectedExpense(null)
      await loadExpenses(month)
      toast.success('Despesa excluída', 'O lançamento foi removido da lista.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir'
      setError(message)
      toast.error('Não foi possível excluir', message)
    }
  }

  async function uploadAttachment(id: number, file?: File) {
    if (!file) return
    const body = new FormData()
    body.append('file', file)
    try {
      const result = await api<{ message: string; path: string }>(`/expenses/${id}/attachment`, { method: 'POST', body })
      setSelectedExpense((current) => current?.id === id ? { ...current, attachment_path: result.path } : current)
      await loadExpenses(month)
      toast.success('Comprovante anexado', file.name)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao anexar comprovante'
      setError(message)
      toast.error('Não foi possível anexar', message)
    }
  }

  const normalizedFilter = filterText.trim().toLocaleLowerCase('pt-BR')
  const filteredItems = items.filter((item) => {
    if (normalizedFilter && !`${item.description} ${item.merchant || ''} ${item.notes || ''}`.toLocaleLowerCase('pt-BR').includes(normalizedFilter)) return false
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (filterCategory !== 'all' && String(item.category_id || '') !== filterCategory) return false
    const effectivePayment = item.card_id ? 'credit_card' : (item.payment_method || '')
    if (filterPayment !== 'all' && effectivePayment !== filterPayment) return false
    return true
  })

  return <>
    <PageHeader title="Despesas" subtitle="Gastos fixos, variáveis, cartões e parcelamentos" actions={<><input className="month-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /><ReceiptScanButton kind="expense" onScanned={openFromReceipt} /><button className="primary-button compact" onClick={openNew}>+ Nova despesa</button></>} />
    {showForm && <ModalCard onClose={closeForm} label={editing ? `Editar despesa ${editing.description}` : 'Nova despesa'} wide><form id="expense-form" key={editing?.id || `new-expense-${scanVersion}`} className="panel form-grid modal-form" onSubmit={submit}>
      <h3 className="form-title wide">{editing ? 'Editar despesa ou pagamento' : 'Nova despesa'}</h3>
      {scanDraft && <div className="receipt-scan-note"><strong>✓ Dados preenchidos pela câmera</strong><span>Revise valor, categoria e forma de pagamento antes de salvar. A foto será anexada ao lançamento.</span>{scanDraft.confidence > 0 && <small>Confiança da leitura: {scanDraft.confidence}%</small>}</div>}
      {!editing && !scanDraft && <label className="toggle-line wide"><input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} /> Criar como gasto fixo mensal</label>}
      <label className="wide">Descrição<input name="description" required defaultValue={editing?.description || scanDraft?.description || ''} /></label>
      <label>Valor<MoneyInput name="amount" required defaultValue={editing ? Number(editing.amount) : scanDraft?.amount ?? ''} /></label>
      <label>Categoria<select name="category_id" defaultValue={editing?.category_id || categoryIdFromHint(categories, scanDraft?.categoryHint || '')}><option value="">Sem categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Estabelecimento<input name="merchant" defaultValue={editing?.merchant || scanDraft?.merchant || ''} /></label>
      <label>Forma de pagamento<select name="payment_method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="pix">Pix</option><option value="debit">Débito</option><option value="cash">Dinheiro</option><option value="transfer">Transferência</option><option value="boleto">Boleto</option>{!fixed && <option value="credit_card">Cartão de crédito</option>}</select></label>
      <label>Conta<select name="account_id" defaultValue={editing?.account_id || ''}><option value="">Não informada</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {(!fixed || editing) ? <>
        <label>Vencimento<input name="due_date" type="date" defaultValue={editing?.due_date || scanDraft?.documentDate || `${month}-10`} required /></label>
        {paymentMethod === 'credit_card' && <>
          <label>Data da compra<input name="purchase_date" type="date" defaultValue={editing?.purchase_date || scanDraft?.documentDate || today()} required /></label>
          <label>Cartão<select name="card_id" defaultValue={editing?.card_id || ''} required><option value="">Selecione o cartão</option>{cards.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Parcelas<input name="installments" type="number" min="1" max="360" defaultValue="1" disabled={Boolean(editing)} />{editing?.total_installments && <small>Esta edição altera somente a parcela {editing.installment_number}/{editing.total_installments}.</small>}</label>
        </>}
        <label>Situação<select name="status" value={expenseStatus} onChange={(event) => {
          const nextStatus = event.target.value
          setExpenseStatus(nextStatus)
          if (nextStatus === 'pending') setPaidDate('')
          if (nextStatus === 'paid' && !paidDate) setPaidDate(today())
        }}><option value="pending">Pendente</option><option value="paid">Paga</option></select></label>
        <label>Data do pagamento<input name="paid_date" type="date" value={paidDate} onChange={(event) => {
          const nextDate = event.target.value
          setPaidDate(nextDate)
          if (nextDate) setExpenseStatus('paid')
        }} /><small>{paidDate ? 'Ao informar uma data, a despesa será marcada como paga.' : 'Preencha para registrar o pagamento.'}</small></label>
        <label className="wide">Observações<textarea name="notes" rows={2} defaultValue={editing?.notes || scanDraft?.notes || ''} /></label>
      </> : <>
        <label>Dia do vencimento<input name="due_day" type="number" min="1" max="31" defaultValue="10" required /></label>
        <label>Gerar próximos meses<input name="months_to_generate" type="number" min="1" max="120" defaultValue="12" /></label>
        <label>Mês final opcional<input name="end_month" type="month" /></label>
      </>}
      <div className="form-actions"><button className="primary-button">{editing ? 'Salvar alterações' : 'Salvar'}</button><button type="button" className="secondary-button" onClick={closeForm}>Cancelar</button></div>
    </form></ModalCard>}
    {selectedExpense && <ModalCard onClose={() => setSelectedExpense(null)} label={`Detalhes da despesa ${selectedExpense.description}`} wide>
      <article className="panel expense-detail-panel">
        <div className="expense-detail-header">
          <div><small>Despesa</small><h3>{expenseDescription(selectedExpense)}</h3></div>
          <span className={`status ${selectedExpense.status}`}>{selectedExpense.status === 'paid' ? 'Paga' : 'Pendente'}</span>
        </div>
        <dl className="expense-detail-grid">
          <div><dt>Valor</dt><dd>{money(Number(selectedExpense.amount))}</dd></div>
          <div><dt>Vencimento</dt><dd>{formatDate(selectedExpense.due_date)}</dd></div>
          <div><dt>Forma de pagamento</dt><dd>{paymentMethodLabel(selectedExpense.card_id ? 'credit_card' : selectedExpense.payment_method)}</dd></div>
          <div><dt>Conta</dt><dd>{accounts.find((item) => item.id === selectedExpense.account_id)?.name || 'Não informada'}</dd></div>
          <div><dt>Categoria</dt><dd>{categories.find((item) => item.id === selectedExpense.category_id)?.name || 'Sem categoria'}</dd></div>
          <div><dt>Estabelecimento</dt><dd>{selectedExpense.merchant || 'Não informado'}</dd></div>
          {selectedExpense.card_id && <div><dt>Cartão</dt><dd>{cards.find((item) => item.id === selectedExpense.card_id)?.name || 'Cartão'}</dd></div>}
          {selectedExpense.card_id && <div><dt>Data da compra</dt><dd>{formatDate(selectedExpense.purchase_date)}</dd></div>}
          {selectedExpense.paid_date && <div><dt>Data do pagamento</dt><dd>{formatDate(selectedExpense.paid_date)}</dd></div>}
          {selectedExpense.installment_number && <div><dt>Parcela</dt><dd>{selectedExpense.installment_number}/{selectedExpense.total_installments}</dd></div>}
          {selectedExpense.recurrence_id && <div><dt>Recorrência</dt><dd>Despesa recorrente mensal</dd></div>}
        </dl>
        {selectedExpense.notes && <div className="expense-detail-notes"><strong>Observações</strong><p>{selectedExpense.notes}</p></div>}
        <section className="expense-attachment-preview">
          <h4>Comprovante</h4>
          {!selectedExpense.attachment_path && <p className="muted-text">Nenhum comprovante anexado.</p>}
          {attachmentLoading && <p className="muted-text">Carregando comprovante...</p>}
          {attachmentError && <div className="form-error">{attachmentError}</div>}
          {attachmentUrl && selectedExpense.attachment_path?.toLowerCase().endsWith('.pdf') && <a className="secondary-button attachment-open-button" href={attachmentUrl} target="_blank" rel="noreferrer">Abrir comprovante em PDF</a>}
          {attachmentUrl && !selectedExpense.attachment_path?.toLowerCase().endsWith('.pdf') && <button type="button" className="expense-attachment-image-button" onClick={() => setFullscreenAttachment(true)} aria-label="Abrir comprovante em tela cheia"><img className="expense-attachment-image" src={attachmentUrl} alt={`Comprovante de ${selectedExpense.description}`} /><small>Toque na imagem para abrir em tela cheia</small></button>}
        </section>
        <div className="expense-detail-actions" aria-label="Ações da despesa">
          {selectedExpense.status !== 'paid' && <button type="button" className="primary-button" onClick={() => void markPaid(selectedExpense)}>Pagar</button>}
          <button type="button" className="secondary-button" onClick={() => {
            const item = selectedExpense
            setSelectedExpense(null)
            openEdit(item)
          }}>Editar</button>
          <label className="secondary-button expense-detail-attachment-button" title={selectedExpense.attachment_path ? 'Substituir comprovante' : 'Anexar comprovante'}>
            {selectedExpense.attachment_path ? 'Trocar anexo' : 'Anexar'}
            <input type="file" accept="image/*,.pdf" onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              void uploadAttachment(selectedExpense.id, file)
            }} />
          </label>
          <button type="button" className="danger-button" onClick={() => void remove(selectedExpense.id)}>Excluir</button>
        </div>
        <div className="expense-detail-close-row"><button type="button" className="secondary-button" onClick={() => setSelectedExpense(null)}>Fechar</button></div>
      </article>
    </ModalCard>}
    {fullscreenAttachment && attachmentUrl && <div className="attachment-lightbox" role="dialog" aria-modal="true" aria-label="Comprovante em tela cheia" onClick={() => setFullscreenAttachment(false)}>
      <button type="button" className="attachment-lightbox-close" onClick={() => setFullscreenAttachment(false)} aria-label="Fechar comprovante">×</button>
      <img className="attachment-lightbox-image" src={attachmentUrl} alt={`Comprovante de ${selectedExpense?.description || 'despesa'}`} onClick={(event) => event.stopPropagation()} />
    </div>}
    {error && <div className="form-error">{error}</div>}
    {loadingItems && <div className="list-refresh-indicator"><span></span> Atualizando despesas...</div>}
    <div className="expense-deadline-legend" aria-label="Legenda dos vencimentos"><span className="paid">Pago</span><span className="soon">Vence em até 7 dias</span><span className="overdue">Vencido</span></div>
    <div className="advanced-filters panel" aria-label="Filtros avançados de despesas">
      <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Buscar descrição, estabelecimento ou observação" />
      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="all">Todos os status</option><option value="pending">Pendentes</option><option value="paid">Pagas</option></select>
      <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}><option value="all">Todas as categorias</option>{categories.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select>
      <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}><option value="all">Todas as formas</option><option value="pix">Pix</option><option value="debit">Débito</option><option value="cash">Dinheiro</option><option value="transfer">Transferência</option><option value="boleto">Boleto</option><option value="credit_card">Cartão de crédito</option></select>
      {(filterText || filterStatus !== 'all' || filterCategory !== 'all' || filterPayment !== 'all') && <button type="button" className="secondary-button compact" onClick={() => { setFilterText(''); setFilterStatus('all'); setFilterCategory('all'); setFilterPayment('all') }}>Limpar filtros</button>}
    </div>
    <section className="table-panel">
      <table className="expenses-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Vencimento</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Status</th>
            <th className="expense-action-heading">Pagar</th>
            <th className="expense-action-heading">Editar</th>
            <th className="expense-action-heading">Anexar</th>
            <th className="expense-action-heading">Excluir</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => <tr
            key={item.id}
            data-expense-id={item.id}
            tabIndex={0}
            title={`${expenseDeadlineTitle(item)}${expenseDeadlineTitle(item) ? ' • ' : ''}Clique para ver os detalhes`}
            className={[targetId === item.id ? 'target-row' : '', expenseDeadlineClass(item), 'expense-row-clickable'].filter(Boolean).join(' ')}
            onClick={() => setSelectedExpense(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSelectedExpense(item)
              }
            }}
          >
            <td><div className="expense-description"><strong>{expenseDescription(item)}</strong>{item.recurrence_id && <small className="recurrence-badge">↻ Recorrente</small>}{item.installment_number && <small className="block">Parcela {item.installment_number}/{item.total_installments}</small>}{item.attachment_path && <small className="block expense-has-attachment">📎 Comprovante anexado</small>}</div></td>
            <td>{item.due_date}</td>
            <td>{item.card_id ? 'Cartão' : item.expense_type === 'fixed' ? 'Fixa' : 'Variável'}</td>
            <td>{money(Number(item.amount))}</td>
            <td><span className={`status ${item.status}`}>{item.status === 'paid' ? 'Paga' : 'Pendente'}</span></td>
            <td className="expense-action-cell" onClick={(event) => event.stopPropagation()}>
              {item.status !== 'paid'
                ? <button type="button" className="table-action-button" onClick={() => markPaid(item)}>Pagar</button>
                : <span className="table-action-placeholder" aria-label="Despesa já paga">—</span>}
            </td>
            <td className="expense-action-cell" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="table-action-button" onClick={() => openEdit(item)}>Editar</button>{item.recurrence_id && <button type="button" className="table-action-button recurrence-stop-action" onClick={() => stopRecurrence(item)}>Parar</button>}
            </td>
            <td className="expense-action-cell" onClick={(event) => event.stopPropagation()}>
              <label className="table-action-button attachment-button" title={item.attachment_path ? 'Substituir comprovante' : 'Anexar comprovante'}>
                Anexar
                <input type="file" accept="image/*,.pdf" onChange={(event) => uploadAttachment(item.id, event.target.files?.[0])} />
              </label>
            </td>
            <td className="expense-action-cell" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="table-action-button" onClick={() => remove(item.id)}>Excluir</button>
            </td>
          </tr>)}
        </tbody>
      </table>
      {filteredItems.length === 0 && !loadingItems && <EmptyState text={items.length ? "Nenhuma despesa corresponde aos filtros." : "Nenhuma despesa neste mês."} />}
    </section>

  </>
}
