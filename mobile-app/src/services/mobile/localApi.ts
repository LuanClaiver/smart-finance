import type { Account, AlertItem, Card, Category, Dashboard, Expense, Income, Loan, LoanInstallment, User } from '../../types'
import { createMobileBackup, listMobileBackups } from './backup'
import {
  changePassword,
  changeRecoveryKey,
  createSession,
  getSessionUser,
  listUsers,
  loginLocal,
  publicUser,
  recoverPassword,
  registerLocal,
} from './auth'
import { execute, getDb, inTransaction, queryOne, queryRows, seedCategories } from './db'
import { hashSecret } from './crypto'
import { createMonthlyPdf } from './report'
import { addMonths, asNumber, boolInt, daysBetween, monthOf, parseJsonBody, randomId, safeDate, todayLocal } from './utils'

export class MobileApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

type UserRow = User & { password_hash?: string | null; recovery_key_hash?: string | null; google_sub?: string | null }

type RequestContext = {
  token: string | null
  selectedOwnerId: number | null
}

function pathParts(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

function requiredText(payload: Record<string, unknown>, key: string, label: string): string {
  const value = String(payload[key] || '').trim()
  if (!value) throw new MobileApiError(`${label} é obrigatório.`)
  return value
}

function userResponse(row: UserRow): User {
  return publicUser(row)
}

async function requireUser(context: RequestContext): Promise<UserRow> {
  const user = await getSessionUser(context.token)
  if (!user) throw new MobileApiError('Sessão expirada. Entre novamente.', 401)
  return user
}

async function requireAdmin(context: RequestContext): Promise<UserRow> {
  const user = await requireUser(context)
  if (user.role !== 'admin') throw new MobileApiError('Acesso restrito ao administrador.', 403)
  return user
}

async function ownerId(context: RequestContext): Promise<number> {
  const user = await requireUser(context)
  if (user.role === 'admin' && context.selectedOwnerId) {
    const target = await queryOne<{ id: number }>('SELECT id FROM users WHERE id = ? AND is_active = 1', [context.selectedOwnerId])
    if (target) return Number(target.id)
  }
  return Number(user.id)
}

function normalizeCard(row: Record<string, unknown>): Card {
  return {
    id: Number(row.id), name: String(row.name), bank: String(row.bank || ''), brand: String(row.brand || ''),
    credit_limit: asNumber(row.credit_limit), closing_day: Number(row.closing_day), due_day: Number(row.due_day),
    payment_account_id: row.payment_account_id == null ? undefined : Number(row.payment_account_id), color: String(row.color || '#22c55e'),
    is_active: Boolean(row.is_active),
  }
}

function normalizeExpense(row: Record<string, unknown>): Expense {
  return {
    id: Number(row.id), description: String(row.description), amount: asNumber(row.amount), purchase_date: String(row.purchase_date),
    due_date: String(row.due_date), paid_date: row.paid_date ? String(row.paid_date) : undefined,
    category_id: row.category_id == null ? undefined : Number(row.category_id), expense_type: String(row.expense_type),
    payment_method: String(row.payment_method), merchant: String(row.merchant || ''), notes: String(row.notes || ''), status: String(row.status),
    account_id: row.account_id == null ? undefined : Number(row.account_id), card_id: row.card_id == null ? undefined : Number(row.card_id),
    billing_month: String(row.billing_month), list_month: String(row.list_month || row.billing_month),
    installment_number: row.installment_number == null ? undefined : Number(row.installment_number),
    total_installments: row.total_installments == null ? undefined : Number(row.total_installments),
    attachment_path: row.attachment_path ? String(row.attachment_path) : undefined,
  }
}

function normalizeIncome(row: Record<string, unknown>): Income {
  return {
    id: Number(row.id), description: String(row.description), amount_expected: asNumber(row.amount_expected), amount_received: asNumber(row.amount_received),
    expected_date: String(row.expected_date), received_date: row.received_date ? String(row.received_date) : undefined,
    status: String(row.status), account_id: row.account_id == null ? undefined : Number(row.account_id),
    category_id: row.category_id == null ? undefined : Number(row.category_id), notes: String(row.notes || ''),
  }
}

function normalizeAccount(row: Record<string, unknown>): Account {
  return { id: Number(row.id), name: String(row.name), account_type: String(row.account_type), initial_balance: asNumber(row.initial_balance), is_active: Boolean(row.is_active) }
}

function normalizeCategory(row: Record<string, unknown>): Category {
  return { id: Number(row.id), name: String(row.name), kind: String(row.kind), is_active: Boolean(row.is_active) }
}

function normalizeInstallment(row: Record<string, unknown>): LoanInstallment {
  return {
    id: Number(row.id), installment_number: Number(row.installment_number), due_date: String(row.due_date), amount: asNumber(row.amount),
    status: String(row.status), paid_date: row.paid_date ? String(row.paid_date) : undefined,
    account_id: row.account_id == null ? undefined : Number(row.account_id),
  }
}

async function normalizeLoanRows(rows: Record<string, unknown>[]): Promise<Loan[]> {
  const result: Loan[] = []
  for (const row of rows) {
    const installments = (await queryRows<Record<string, unknown>>('SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY installment_number', [row.id])).map(normalizeInstallment)
    result.push({
      id: Number(row.id), creditor: String(row.creditor), principal_amount: asNumber(row.principal_amount), total_amount: asNumber(row.total_amount),
      interest_rate: asNumber(row.interest_rate), installment_count: Number(row.installment_count), installment_amount: asNumber(row.installment_amount),
      first_due_date: String(row.first_due_date), notes: String(row.notes || ''), active: Boolean(row.active), installments,
    })
  }
  return result
}

async function owned(table: string, id: number, owner: number): Promise<Record<string, unknown>> {
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ? AND owner_id = ?`, [id, owner])
  if (!row) throw new MobileApiError('Registro não encontrado', 404)
  return row
}

function cardBillingMonth(purchaseDate: string, card: Card): string {
  if (Number(purchaseDate.slice(8, 10)) > card.closing_day) return monthOf(addMonths(`${purchaseDate.slice(0, 8)}01`, 1))
  return monthOf(purchaseDate)
}

async function getCard(id: number, owner: number): Promise<Card> {
  return normalizeCard(await owned('cards', id, owner))
}

async function dashboard(owner: number, month: string): Promise<Dashboard> {
  const incomes = (await queryRows<Record<string, unknown>>('SELECT * FROM incomes WHERE owner_id = ? AND substr(expected_date, 1, 7) = ?', [owner, month])).map(normalizeIncome)
  const expenses = (await queryRows<Record<string, unknown>>('SELECT * FROM expenses WHERE owner_id = ? AND COALESCE(list_month, billing_month) = ?', [owner, month])).map(normalizeExpense)
  const installments = (await queryRows<Record<string, unknown>>('SELECT * FROM loan_installments WHERE owner_id = ? AND substr(due_date, 1, 7) = ?', [owner, month])).map(normalizeInstallment)
  const incomeExpected = incomes.reduce((sum, item) => sum + item.amount_expected, 0)
  const incomeReceived = incomes.filter((item) => item.status === 'received').reduce((sum, item) => sum + item.amount_received, 0)
  const expenseExpected = expenses.reduce((sum, item) => sum + item.amount, 0) + installments.reduce((sum, item) => sum + item.amount, 0)
  const expensePaid = expenses.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
    + installments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
  const categoryMap = new Map<number | null, number>()
  expenses.forEach((item) => categoryMap.set(item.category_id || null, (categoryMap.get(item.category_id || null) || 0) + item.amount))
  return {
    month, income_expected: incomeExpected, income_received: incomeReceived, expense_expected: expenseExpected, expense_paid: expensePaid,
    balance_expected: incomeExpected - expenseExpected, balance_real: incomeReceived - expensePaid,
    pending_expenses: expenses.filter((item) => item.status !== 'paid').length + installments.filter((item) => item.status !== 'paid').length,
    entries: incomes.length + expenses.length + installments.length,
    by_category: [...categoryMap.entries()].map(([category_id, total]) => ({ category_id, total })),
  }
}

async function alerts(owner: number): Promise<AlertItem[]> {
  const today = todayLocal()
  const horizon = addMonths(today, 0)
  const horizonDate = new Date(`${today}T12:00:00`)
  horizonDate.setDate(horizonDate.getDate() + 7)
  const horizonText = `${horizonDate.getFullYear()}-${String(horizonDate.getMonth() + 1).padStart(2, '0')}-${String(horizonDate.getDate()).padStart(2, '0')}`
  void horizon
  const result: AlertItem[] = []
  const expenseRows = (await queryRows<Record<string, unknown>>('SELECT * FROM expenses WHERE owner_id = ? AND status <> ? AND due_date <= ?', [owner, 'paid', horizonText])).map(normalizeExpense)
  for (const item of expenseRows) {
    const days = daysBetween(today, item.due_date)
    result.push({ type: 'expense', level: days < 0 ? 'danger' : days <= 3 ? 'warning' : 'info', title: item.description,
      message: days < 0 ? 'vencida' : days === 0 ? 'vence hoje' : `vence em ${days} dia(s)`, date: item.due_date, amount: item.amount,
      target_id: item.id, target_page: 'expenses', month: item.list_month || item.billing_month })
  }
  const installmentRows = await queryRows<Record<string, unknown>>(
    `SELECT li.*, l.creditor FROM loan_installments li JOIN loans l ON l.id = li.loan_id
     WHERE li.owner_id = ? AND li.status <> ? AND li.due_date <= ?`, [owner, 'paid', horizonText],
  )
  for (const row of installmentRows) {
    const days = daysBetween(today, String(row.due_date))
    result.push({ type: 'loan', level: days < 0 ? 'danger' : days <= 3 ? 'warning' : 'info', title: `${row.creditor} • parcela ${row.installment_number}`,
      message: days < 0 ? 'parcela vencida' : days === 0 ? 'parcela vence hoje' : `parcela vence em ${days} dia(s)`, date: String(row.due_date),
      amount: asNumber(row.amount), target_id: Number(row.id), target_page: 'loans', month: monthOf(String(row.due_date)) })
  }
  const incomeRows = (await queryRows<Record<string, unknown>>('SELECT * FROM incomes WHERE owner_id = ? AND status <> ? AND expected_date <= ?', [owner, 'received', today])).map(normalizeIncome)
  incomeRows.forEach((item) => result.push({ type: 'income', level: 'warning', title: item.description, message: 'renda prevista ainda não recebida',
    date: item.expected_date, amount: item.amount_expected, target_id: item.id, target_page: 'incomes', month: monthOf(item.expected_date) }))
  const priority = { danger: 0, warning: 1, info: 2 }
  return result.sort((a, b) => a.date.localeCompare(b.date) || priority[a.level] - priority[b.level])
}

async function createExpenses(owner: number, payload: Record<string, unknown>): Promise<Expense[]> {
  const description = requiredText(payload, 'description', 'Descrição')
  const total = asNumber(payload.amount)
  if (total <= 0) throw new MobileApiError('Informe um valor maior que zero.')
  const count = Math.max(1, Math.min(360, Number(payload.installments || 1)))
  const purchaseDate = String(payload.purchase_date || todayLocal())
  const dueDate = String(payload.due_date || purchaseDate)
  const cardId = payload.card_id ? Number(payload.card_id) : null
  const card = cardId ? await getCard(cardId, owner) : null
  const base = Math.floor((total / count) * 100) / 100
  const amounts = Array.from({ length: count }, () => base)
  amounts[count - 1] = Math.round((total - base * (count - 1)) * 100) / 100
  const group = count > 1 ? randomId() : null
  const normalizedStatus = payload.paid_date || payload.status === 'paid' ? 'paid' : 'pending'
  const paidDate = normalizedStatus === 'paid' ? String(payload.paid_date || todayLocal()) : null
  const created: Expense[] = []
  await inTransaction(async (database) => {
    for (let index = 0; index < count; index += 1) {
      const purchase = count > 1 ? addMonths(purchaseDate, index) : purchaseDate
      const due = count > 1 ? addMonths(dueDate, index) : dueDate
      const billingMonth = card ? cardBillingMonth(purchase, card) : monthOf(due)
      const listMonth = payload.list_month ? monthOf(addMonths(`${String(payload.list_month)}-01`, count > 1 ? index : 0)) : billingMonth
      const inserted = await database.run(
        `INSERT INTO expenses(owner_id, description, amount, purchase_date, due_date, paid_date, category_id, expense_type,
          payment_method, merchant, notes, status, account_id, card_id, installment_group, installment_number, total_installments,
          billing_month, list_month, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [owner, description, amounts[index], purchase, due, paidDate, payload.category_id || null, String(payload.expense_type || 'variable'),
          String(payload.payment_method || 'pix'), String(payload.merchant || ''), String(payload.notes || ''), normalizedStatus,
          payload.account_id || null, cardId, group, count > 1 ? index + 1 : null, count > 1 ? count : null, billingMonth, listMonth, new Date().toISOString()],
      )
      const row = await database.query('SELECT * FROM expenses WHERE id = ?', [inserted.changes?.lastId])
      if (row.values?.[0]) created.push(normalizeExpense(row.values[0] as Record<string, unknown>))
    }
  })
  return created
}

async function updateExpense(owner: number, id: number, payload: Record<string, unknown>): Promise<Expense> {
  const existing = await owned('expenses', id, owner)
  const purchaseDate = String(payload.purchase_date || existing.purchase_date)
  const dueDate = String(payload.due_date || existing.due_date)
  const cardId = payload.card_id ? Number(payload.card_id) : null
  const card = cardId ? await getCard(cardId, owner) : null
  const paidDateInput = payload.paid_date ? String(payload.paid_date) : null
  const status = paidDateInput || payload.status === 'paid' ? 'paid' : 'pending'
  const paidDate = status === 'paid' ? paidDateInput || todayLocal() : null
  const billingMonth = card ? cardBillingMonth(purchaseDate, card) : monthOf(dueDate)
  const listMonth = String(payload.list_month || existing.list_month || billingMonth)
  await execute(
    `UPDATE expenses SET description=?, amount=?, purchase_date=?, due_date=?, paid_date=?, category_id=?, expense_type=?, payment_method=?, merchant=?,
     notes=?, status=?, account_id=?, card_id=?, billing_month=?, list_month=? WHERE id=? AND owner_id=?`,
    [requiredText(payload, 'description', 'Descrição'), asNumber(payload.amount), purchaseDate, dueDate, paidDate, payload.category_id || null,
      String(payload.expense_type || 'variable'), String(payload.payment_method || 'pix'), String(payload.merchant || ''), String(payload.notes || ''),
      status, payload.account_id || null, cardId, billingMonth, listMonth, id, owner],
  )
  return normalizeExpense((await owned('expenses', id, owner)))
}

async function createRecurrence(owner: number, payload: Record<string, unknown>): Promise<{ generated: number }> {
  const startMonth = String(payload.start_month)
  const dueDay = Number(payload.due_day)
  const months = Math.max(1, Math.min(120, Number(payload.months_to_generate || 12)))
  const recurrenceId = await execute(
    `INSERT INTO recurring_expenses(owner_id, description, amount, due_day, category_id, payment_method, merchant, account_id, start_month, end_month, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [owner, requiredText(payload, 'description', 'Descrição'), asNumber(payload.amount), dueDay, payload.category_id || null,
      String(payload.payment_method || 'pix'), String(payload.merchant || ''), payload.account_id || null, startMonth, payload.end_month || null],
  )
  let generated = 0
  for (let offset = 0; offset < months; offset += 1) {
    const cursor = addMonths(`${startMonth}-01`, offset)
    const month = monthOf(cursor)
    if (payload.end_month && month > String(payload.end_month)) break
    const [year, number] = month.split('-').map(Number)
    const due = safeDate(year, number, dueDay)
    await execute(
      `INSERT INTO expenses(owner_id, description, amount, purchase_date, due_date, category_id, expense_type, payment_method, merchant,
       status, account_id, recurrence_id, billing_month, list_month, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'fixed', ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [owner, String(payload.description), asNumber(payload.amount), due, due, payload.category_id || null, String(payload.payment_method || 'pix'),
        String(payload.merchant || ''), payload.account_id || null, recurrenceId, month, month, new Date().toISOString()],
    )
    generated += 1
  }
  return { generated }
}

async function createLoan(owner: number, payload: Record<string, unknown>): Promise<Loan> {
  const count = Number(payload.installment_count)
  const loanId = await execute(
    `INSERT INTO loans(owner_id, creditor, principal_amount, total_amount, interest_rate, installment_count, installment_amount, first_due_date, notes, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [owner, requiredText(payload, 'creditor', 'Instituição'), asNumber(payload.principal_amount), asNumber(payload.total_amount), asNumber(payload.interest_rate),
      count, asNumber(payload.installment_amount), String(payload.first_due_date), String(payload.notes || ''), new Date().toISOString()],
  )
  for (let index = 0; index < count; index += 1) {
    await execute('INSERT INTO loan_installments(loan_id, owner_id, installment_number, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)',
      [loanId, owner, index + 1, addMonths(String(payload.first_due_date), index), asNumber(payload.installment_amount), 'pending'])
  }
  return (await normalizeLoanRows([await owned('loans', loanId, owner)]))[0]
}

async function updateLoan(owner: number, id: number, payload: Record<string, unknown>): Promise<Loan> {
  await owned('loans', id, owner)
  const count = Number(payload.installment_count)
  const paidOutside = await queryOne<{ id: number }>('SELECT id FROM loan_installments WHERE loan_id=? AND owner_id=? AND status=? AND installment_number>? LIMIT 1', [id, owner, 'paid', count])
  if (paidOutside) throw new MobileApiError('A quantidade de parcelas não pode ser menor que uma parcela já paga.')
  await execute(
    `UPDATE loans SET creditor=?, principal_amount=?, total_amount=?, interest_rate=?, installment_count=?, installment_amount=?, first_due_date=?, notes=?
     WHERE id=? AND owner_id=?`,
    [requiredText(payload, 'creditor', 'Instituição'), asNumber(payload.principal_amount), asNumber(payload.total_amount), asNumber(payload.interest_rate), count,
      asNumber(payload.installment_amount), String(payload.first_due_date), String(payload.notes || ''), id, owner],
  )
  for (let number = 1; number <= count; number += 1) {
    const installment = await queryOne<Record<string, unknown>>('SELECT * FROM loan_installments WHERE loan_id=? AND installment_number=?', [id, number])
    const due = addMonths(String(payload.first_due_date), number - 1)
    if (!installment) await execute('INSERT INTO loan_installments(loan_id, owner_id, installment_number, due_date, amount, status) VALUES (?, ?, ?, ?, ?, ?)', [id, owner, number, due, asNumber(payload.installment_amount), 'pending'])
    else if (installment.status !== 'paid') await execute('UPDATE loan_installments SET due_date=?, amount=? WHERE id=?', [due, asNumber(payload.installment_amount), installment.id])
  }
  await execute('DELETE FROM loan_installments WHERE loan_id=? AND installment_number>? AND status<>?', [id, count, 'paid'])
  return (await normalizeLoanRows([await owned('loans', id, owner)]))[0]
}

async function uploadAttachment(owner: number, id: number, options: RequestInit): Promise<{ message: string; path: string }> {
  const item = await owned('expenses', id, owner)
  if (!(options.body instanceof FormData)) throw new MobileApiError('Arquivo não informado.')
  const file = options.body.get('file')
  if (!(file instanceof File)) throw new MobileApiError('Arquivo não informado.')
  if (file.size > 10 * 1024 * 1024) throw new MobileApiError('Arquivo maior que 10 MB')
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension)) throw new MobileApiError('Formato não permitido')
  const { Directory, Filesystem } = await import('@capacitor/filesystem')
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
  const dueDate = String(item.due_date)
  const path = `SmartFinance/comprovantes/${owner}/${dueDate.slice(0, 7)}/expense-${id}.${extension}`
  await Filesystem.writeFile({ path, data: base64, directory: Directory.Data, recursive: true })
  await execute('UPDATE expenses SET attachment_path=? WHERE id=? AND owner_id=?', [path, id, owner])
  return { message: 'Comprovante anexado', path }
}

export async function handleLocalApi<T>(path: string, options: RequestInit, context: RequestContext): Promise<T> {
  const url = new URL(path, 'https://smartfinance.local')
  const method = String(options.method || 'GET').toUpperCase()
  const parts = pathParts(url.pathname)
  const payload = parseJsonBody(options)

  // Autenticação
  if (url.pathname === '/auth/login' && method === 'POST') return await loginLocal(String(payload.identifier || ''), String(payload.password || '')) as T
  if (url.pathname === '/auth/register' && method === 'POST') return await registerLocal(payload) as T
  if (url.pathname === '/auth/recover' && method === 'POST') return await recoverPassword(payload) as T
  if (url.pathname === '/auth/me' && method === 'GET') return userResponse(await requireUser(context)) as T
  if (url.pathname === '/auth/change-password' && method === 'POST') return await changePassword(Number((await requireUser(context)).id), payload) as T
  if (url.pathname === '/auth/change-recovery-key' && method === 'POST') return await changeRecoveryKey(Number((await requireUser(context)).id), payload) as T

  // Administração
  if (url.pathname === '/admin/users' && method === 'GET') { await requireAdmin(context); return await listUsers() as T }
  if (parts[0] === 'admin' && parts[1] === 'users' && parts[2]) {
    const admin = await requireAdmin(context)
    const id = Number(parts[2])
    const target = await queryOne<UserRow>('SELECT * FROM users WHERE id=?', [id])
    if (!target) throw new MobileApiError('Usuário não encontrado', 404)
    if (method === 'PATCH') {
      const updates: string[] = []
      const values: unknown[] = []
      for (const key of ['username', 'display_name', 'email', 'role', 'is_active'] as const) {
        if (key in payload) { updates.push(`${key}=?`); values.push(key === 'is_active' ? boolInt(payload[key]) : payload[key]) }
      }
      if (payload.password) { updates.push('password_hash=?', 'must_change_password=1'); values.push(await hashSecret(String(payload.password))) }
      if (updates.length) { values.push(id); await execute(`UPDATE users SET ${updates.join(', ')} WHERE id=?`, values) }
      return userResponse((await queryOne<UserRow>('SELECT * FROM users WHERE id=?', [id]))!) as T
    }
    if (method === 'DELETE') {
      if (Number(admin.id) === id) throw new MobileApiError('Você não pode excluir a conta em uso.')
      await execute('DELETE FROM users WHERE id=?', [id])
      return { message: 'Usuário excluído' } as T
    }
  }

  const owner = await ownerId(context)

  // Dashboard e alertas
  if (url.pathname === '/dashboard' && method === 'GET') return await dashboard(owner, String(url.searchParams.get('month') || monthOf(todayLocal()))) as T
  if (url.pathname === '/alerts' && method === 'GET') return await alerts(owner) as T

  // Categorias
  if (url.pathname === '/categories' && method === 'GET') {
    const kind = url.searchParams.get('kind')
    const rows = await queryRows<Record<string, unknown>>(`SELECT * FROM categories WHERE owner_id=?${kind ? ' AND kind=?' : ''} ORDER BY name COLLATE NOCASE`, kind ? [owner, kind] : [owner])
    return rows.map(normalizeCategory) as T
  }
  if (url.pathname === '/categories' && method === 'POST') {
    const id = await execute('INSERT INTO categories(owner_id,name,kind,is_active) VALUES (?,?,?,?)', [owner, requiredText(payload, 'name', 'Nome'), String(payload.kind || 'expense'), boolInt(payload.is_active ?? true)])
    return normalizeCategory((await owned('categories', id, owner))) as T
  }
  if (parts[0] === 'categories' && parts[1] && method === 'PATCH') {
    const id = Number(parts[1]); await owned('categories', id, owner)
    await execute('UPDATE categories SET name=?, kind=?, is_active=? WHERE id=? AND owner_id=?', [requiredText(payload, 'name', 'Nome'), String(payload.kind || 'expense'), boolInt(payload.is_active), id, owner])
    return normalizeCategory((await owned('categories', id, owner))) as T
  }

  // Contas
  if (url.pathname === '/accounts' && method === 'GET') return (await queryRows<Record<string, unknown>>('SELECT * FROM accounts WHERE owner_id=? ORDER BY name COLLATE NOCASE', [owner])).map(normalizeAccount) as T
  if (url.pathname === '/accounts' && method === 'POST') {
    const id = await execute('INSERT INTO accounts(owner_id,name,account_type,initial_balance,is_active,created_at) VALUES (?,?,?,?,?,?)', [owner, requiredText(payload, 'name', 'Nome'), String(payload.account_type || 'digital'), asNumber(payload.initial_balance), boolInt(payload.is_active ?? true), new Date().toISOString()])
    return normalizeAccount(await owned('accounts', id, owner)) as T
  }
  if (parts[0] === 'accounts' && parts[1]) {
    const id = Number(parts[1]); await owned('accounts', id, owner)
    if (method === 'PATCH') { await execute('UPDATE accounts SET name=?,account_type=?,initial_balance=?,is_active=? WHERE id=? AND owner_id=?', [requiredText(payload, 'name', 'Nome'), String(payload.account_type || 'digital'), asNumber(payload.initial_balance), boolInt(payload.is_active ?? true), id, owner]); return normalizeAccount(await owned('accounts', id, owner)) as T }
    if (method === 'DELETE') { await execute('DELETE FROM accounts WHERE id=? AND owner_id=?', [id, owner]); return { message: 'Conta excluída' } as T }
  }

  // Cartões e faturas
  if (url.pathname === '/cards' && method === 'GET') return (await queryRows<Record<string, unknown>>('SELECT * FROM cards WHERE owner_id=? ORDER BY name COLLATE NOCASE', [owner])).map(normalizeCard) as T
  if (url.pathname === '/cards' && method === 'POST') {
    const id = await execute(`INSERT INTO cards(owner_id,name,bank,brand,credit_limit,closing_day,due_day,payment_account_id,color,is_active) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [owner, requiredText(payload, 'name', 'Nome'), String(payload.bank || ''), String(payload.brand || ''), asNumber(payload.credit_limit), Number(payload.closing_day || 1), Number(payload.due_day || 10), payload.payment_account_id || null, String(payload.color || '#22c55e'), boolInt(payload.is_active ?? true)])
    return normalizeCard(await owned('cards', id, owner)) as T
  }
  if (parts[0] === 'cards' && parts[1]) {
    const id = Number(parts[1])
    if (parts[2] === 'invoice') {
      const card = await getCard(id, owner)
      const month = String(url.searchParams.get('month') || monthOf(todayLocal()))
      if (parts[3] === 'pay' && method === 'POST') {
        const rows = await queryRows<Record<string, unknown>>('SELECT id FROM expenses WHERE owner_id=? AND card_id=? AND billing_month=?', [owner, id, month])
        if (!rows.length) throw new MobileApiError('Fatura sem lançamentos', 404)
        await execute('UPDATE expenses SET status=?,paid_date=?,account_id=COALESCE(?,account_id) WHERE owner_id=? AND card_id=? AND billing_month=?', ['paid', todayLocal(), url.searchParams.get('account_id') ? Number(url.searchParams.get('account_id')) : null, owner, id, month])
        return { message: 'Fatura marcada como paga', items: rows.length } as T
      }
      if (method === 'GET') {
        const itemRows = await queryRows<Record<string, unknown>>('SELECT * FROM expenses WHERE owner_id=? AND card_id=? AND billing_month=? ORDER BY purchase_date,created_at', [owner, id, month])
        const items = itemRows.map(normalizeExpense)
        const available = await queryRows<{ billing_month: string }>('SELECT DISTINCT billing_month FROM expenses WHERE owner_id=? AND card_id=? ORDER BY billing_month', [owner, id])
        return { card, month, requested_month: month, total: items.reduce((sum, item) => sum + item.amount, 0), status: items.length && items.every((item) => item.status === 'paid') ? 'paid' : 'open', items, available_months: available.map((item) => item.billing_month) } as T
      }
    }
    await owned('cards', id, owner)
    if (method === 'PATCH') { await execute(`UPDATE cards SET name=?,bank=?,brand=?,credit_limit=?,closing_day=?,due_day=?,payment_account_id=?,color=?,is_active=? WHERE id=? AND owner_id=?`, [requiredText(payload, 'name', 'Nome'), String(payload.bank || ''), String(payload.brand || ''), asNumber(payload.credit_limit), Number(payload.closing_day), Number(payload.due_day), payload.payment_account_id || null, String(payload.color || '#22c55e'), boolInt(payload.is_active ?? true), id, owner]); return normalizeCard(await owned('cards', id, owner)) as T }
    if (method === 'DELETE') { await execute('UPDATE expenses SET card_id=NULL WHERE card_id=? AND owner_id=?', [id, owner]); await execute('DELETE FROM cards WHERE id=? AND owner_id=?', [id, owner]); return { message: 'Cartão excluído' } as T }
  }

  // Rendas
  if (url.pathname === '/incomes' && method === 'GET') return (await queryRows<Record<string, unknown>>('SELECT * FROM incomes WHERE owner_id=? AND substr(expected_date,1,7)=? ORDER BY expected_date DESC', [owner, String(url.searchParams.get('month'))])).map(normalizeIncome) as T
  if (url.pathname === '/incomes' && method === 'POST') {
    const id = await execute(`INSERT INTO incomes(owner_id,description,amount_expected,amount_received,expected_date,received_date,status,account_id,category_id,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [owner, requiredText(payload, 'description', 'Descrição'), asNumber(payload.amount_expected), asNumber(payload.amount_received), String(payload.expected_date), payload.received_date || null, String(payload.status || 'pending'), payload.account_id || null, payload.category_id || null, String(payload.notes || ''), new Date().toISOString()])
    return normalizeIncome(await owned('incomes', id, owner)) as T
  }
  if (parts[0] === 'incomes' && parts[1]) {
    const id = Number(parts[1]); await owned('incomes', id, owner)
    if (method === 'PATCH') { await execute(`UPDATE incomes SET description=?,amount_expected=?,amount_received=?,expected_date=?,received_date=?,status=?,account_id=?,category_id=?,notes=? WHERE id=? AND owner_id=?`, [requiredText(payload, 'description', 'Descrição'), asNumber(payload.amount_expected), asNumber(payload.amount_received), String(payload.expected_date), payload.received_date || null, String(payload.status || 'pending'), payload.account_id || null, payload.category_id || null, String(payload.notes || ''), id, owner]); return normalizeIncome(await owned('incomes', id, owner)) as T }
    if (method === 'DELETE') { await execute('DELETE FROM incomes WHERE id=? AND owner_id=?', [id, owner]); return { message: 'Renda excluída' } as T }
  }

  // Despesas
  if (url.pathname === '/expenses' && method === 'GET') return (await queryRows<Record<string, unknown>>('SELECT * FROM expenses WHERE owner_id=? AND COALESCE(list_month,billing_month)=? ORDER BY created_at DESC,due_date DESC', [owner, String(url.searchParams.get('month'))])).map(normalizeExpense) as T
  if (url.pathname === '/expenses' && method === 'POST') return await createExpenses(owner, payload) as T
  if (url.pathname === '/recurring-expenses' && method === 'POST') return await createRecurrence(owner, payload) as T
  if (parts[0] === 'expenses' && parts[1]) {
    const id = Number(parts[1])
    if (parts[2] === 'attachment' && method === 'POST') return await uploadAttachment(owner, id, options) as T
    if (method === 'PATCH') return await updateExpense(owner, id, payload) as T
    if (method === 'DELETE') { await owned('expenses', id, owner); await execute('DELETE FROM expenses WHERE id=? AND owner_id=?', [id, owner]); return { message: 'Despesa excluída' } as T }
  }

  // Empréstimos
  if (url.pathname === '/loans' && method === 'GET') return await normalizeLoanRows(await queryRows<Record<string, unknown>>('SELECT * FROM loans WHERE owner_id=? ORDER BY created_at DESC', [owner])) as T
  if (url.pathname === '/loans' && method === 'POST') return await createLoan(owner, payload) as T
  if (parts[0] === 'loans' && parts[1]) {
    const id = Number(parts[1])
    if (method === 'PATCH') return await updateLoan(owner, id, payload) as T
    if (method === 'DELETE') { await owned('loans', id, owner); await execute('DELETE FROM loans WHERE id=? AND owner_id=?', [id, owner]); return { message: 'Empréstimo excluído' } as T }
  }
  if (parts[0] === 'loan-installments' && parts[1]) {
    const id = Number(parts[1]); await owned('loan_installments', id, owner)
    if (parts[2] === 'pay' && method === 'POST') { await execute('UPDATE loan_installments SET status=?,paid_date=?,account_id=? WHERE id=? AND owner_id=?', ['paid', todayLocal(), url.searchParams.get('account_id') ? Number(url.searchParams.get('account_id')) : null, id, owner]); return { message: 'Parcela marcada como paga' } as T }
    if (method === 'PATCH') { const status = String(payload.status || 'pending'); await execute('UPDATE loan_installments SET due_date=?,amount=?,status=?,paid_date=?,account_id=? WHERE id=? AND owner_id=?', [String(payload.due_date), asNumber(payload.amount), status, status === 'paid' ? payload.paid_date || todayLocal() : null, status === 'paid' ? payload.account_id || null : null, id, owner]); return normalizeInstallment(await owned('loan_installments', id, owner)) as T }
  }

  // Relatório
  if (url.pathname === '/reports/monthly.pdf' && method === 'GET') {
    const month = String(url.searchParams.get('month') || monthOf(todayLocal()))
    const user = await requireUser(context)
    const dashboardData = await dashboard(owner, month)
    const incomes = (await queryRows<Record<string, unknown>>('SELECT * FROM incomes WHERE owner_id=? AND substr(expected_date,1,7)=?', [owner, month])).map(normalizeIncome)
    const expenses = (await queryRows<Record<string, unknown>>('SELECT * FROM expenses WHERE owner_id=? AND COALESCE(list_month,billing_month)=?', [owner, month])).map(normalizeExpense)
    const loans = await normalizeLoanRows(await queryRows<Record<string, unknown>>('SELECT * FROM loans WHERE owner_id=?', [owner]))
    const categories = (await queryRows<Record<string, unknown>>('SELECT * FROM categories WHERE owner_id=?', [owner])).map(normalizeCategory)
    const ownerUser = Number(user.id) === owner ? user : await queryOne<UserRow>('SELECT * FROM users WHERE id=?', [owner])
    return await createMonthlyPdf({ month, userName: ownerUser?.display_name || user.display_name, dashboard: dashboardData, incomes, expenses, loans, categories }) as T
  }

  // Backup local
  if (url.pathname === '/backups' && method === 'GET') { await requireAdmin(context); return await listMobileBackups() as T }
  if (url.pathname === '/backups' && method === 'POST') { await requireAdmin(context); return await createMobileBackup() as T }

  throw new MobileApiError(`Operação local ainda não implementada: ${method} ${url.pathname}`, 404)
}
