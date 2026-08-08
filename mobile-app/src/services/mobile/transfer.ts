import { Directory, Filesystem } from '@capacitor/filesystem'
import { createMobileBackup } from './backup'
import { execute, inTransaction, queryOne, queryRows, seedCategories } from './db'

type Row = Record<string, unknown>

type TransferPayload = {
  format: string
  version: number
  created_at?: string
  application_version?: string
  profile?: {
    username?: string
    display_name?: string
    email?: string
  }
  data: {
    categories?: Row[]
    accounts?: Row[]
    cards?: Row[]
    incomes?: Row[]
    recurring_expenses?: Row[]
    recurring_incomes?: Row[]
    expenses?: Row[]
    loans?: Row[]
    loan_installments?: Row[]
    budgets?: Row[]
    goals?: Row[]
    internal_transfers?: Row[]
    import_rules?: Row[]
  }
}

export type TransferImportMode = 'replace' | 'merge'

export type TransferPreview = {
  createdAt: string
  profileName: string
  categories: number
  accounts: number
  cards: number
  incomes: number
  recurringExpenses: number
  recurringIncomes: number
  expenses: number
  loans: number
  loanInstallments: number
  attachments: number
}

export type TransferImportResult = {
  backupCreated: boolean
  imported: {
    categories: number
    accounts: number
    cards: number
    incomes: number
    recurringExpenses: number
    recurringIncomes: number
    expenses: number
    loans: number
    loanInstallments: number
    budgets: number
    goals: number
    transfers: number
    rules: number
    attachments: number
  }
  skippedAttachments: number
}

type LoadedTransfer = {
  files: Map<string, Uint8Array>
  payload: TransferPayload
}

type AttachmentJob = {
  expenseId: number
  archiveName: string
  extension: string
}

type IdMaps = {
  categories: Map<number, number>
  accounts: Map<number, number>
  cards: Map<number, number>
  recurringExpenses: Map<number, number>
  recurringIncomes: Map<number, number>
  loans: Map<number, number>
}

function rows(
  payload: TransferPayload,
  key: keyof TransferPayload['data'],
): Row[] {
  const value = payload.data?.[key]
  return Array.isArray(value) ? value : []
}

function text(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback
  return String(value)
}

function nullableText(value: unknown): string | null {
  const result = text(value).trim()
  return result || null
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function optionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function booleanInteger(value: unknown, fallback = true): number {
  if (value === undefined || value === null) return fallback ? 1 : 0
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return value === 0 ? 0 : 1
  return ['1', 'true', 'yes', 'sim'].includes(String(value).toLowerCase()) ? 1 : 0
}

function sourceId(row: Row): number {
  return numberValue(row.id)
}

function remember(map: Map<number, number>, row: Row, id: number): void {
  const oldId = sourceId(row)
  if (oldId > 0 && id > 0) map.set(oldId, id)
}

function mappedId(map: Map<number, number>, value: unknown): number | null {
  const id = optionalNumber(value)
  return id ? map.get(id) || null : null
}

async function findId(sql: string, values: unknown[]): Promise<number> {
  const row = await queryOne<{ id: number }>(sql, values)
  return numberValue(row?.id)
}

function safeExtension(archiveName: string): string | null {
  const extension = archiveName.split('.').pop()?.toLowerCase() || ''
  return ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension)
    ? extension
    : null
}

const LOCAL_FILE_HEADER = 0x04034b50
const CENTRAL_DIRECTORY_HEADER = 0x02014b50
const END_OF_CENTRAL_DIRECTORY = 0x06054b50

function parseStoredZip(buffer: ArrayBuffer): Map<string, Uint8Array> {
  const view = new DataView(buffer)
  const decoder = new TextDecoder('utf-8')
  const files = new Map<string, Uint8Array>()
  let offset = 0

  while (offset + 4 <= view.byteLength) {
    const signature = view.getUint32(offset, true)

    if (
      signature === CENTRAL_DIRECTORY_HEADER ||
      signature === END_OF_CENTRAL_DIRECTORY
    ) {
      break
    }

    if (signature !== LOCAL_FILE_HEADER || offset + 30 > view.byteLength) {
      throw new Error('O arquivo selecionado não é um pacote Smart Finance válido.')
    }

    const flags = view.getUint16(offset + 6, true)
    const compressionMethod = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const fileNameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)

    if ((flags & 0x0008) !== 0 || compressionMethod !== 0) {
      throw new Error(
        'Este pacote não foi exportado por uma versão compatível do Smart Finance.',
      )
    }

    const fileNameStart = offset + 30
    const dataStart = fileNameStart + fileNameLength + extraLength
    const dataEnd = dataStart + compressedSize

    if (dataEnd > view.byteLength) {
      throw new Error('O pacote está incompleto ou corrompido.')
    }

    const fileName = decoder.decode(
      new Uint8Array(buffer, fileNameStart, fileNameLength),
    )
    files.set(fileName, new Uint8Array(buffer.slice(dataStart, dataEnd)))
    offset = dataEnd
  }

  return files
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length))
    binary += String.fromCharCode(...Array.from(chunk))
  }

  return btoa(binary)
}

async function loadTransferPackage(file: File): Promise<LoadedTransfer> {
  if (!file.name.toLowerCase().endsWith('.zip')) {
    throw new Error('Selecione o arquivo ZIP exportado pelo Smart Finance do computador.')
  }

  let files: Map<string, Uint8Array>
  try {
    files = parseStoredZip(await file.arrayBuffer())
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error('O arquivo selecionado não é um ZIP válido.')
  }

  const dataFile = files.get('dados.json')
  if (!dataFile) {
    throw new Error('O pacote não contém o arquivo dados.json.')
  }

  let payload: TransferPayload
  try {
    payload = JSON.parse(new TextDecoder('utf-8').decode(dataFile)) as TransferPayload
  } catch {
    throw new Error('Não foi possível interpretar os dados do pacote.')
  }

  if (
    payload.format !== 'smart-finance-transfer' ||
    numberValue(payload.version) !== 1 ||
    !payload.data
  ) {
    throw new Error('O arquivo não é um pacote de transferência compatível.')
  }

  return { files, payload }
}

export async function previewTransferPackage(file: File): Promise<TransferPreview> {
  const { payload } = await loadTransferPackage(file)
  const expenses = rows(payload, 'expenses')

  return {
    createdAt: text(payload.created_at),
    profileName:
      text(payload.profile?.display_name).trim() ||
      text(payload.profile?.username).trim() ||
      'Usuário do computador',
    categories: rows(payload, 'categories').length,
    accounts: rows(payload, 'accounts').length,
    cards: rows(payload, 'cards').length,
    incomes: rows(payload, 'incomes').length,
    recurringExpenses: rows(payload, 'recurring_expenses').length,
    recurringIncomes: rows(payload, 'recurring_incomes').length,
    expenses: expenses.length,
    loans: rows(payload, 'loans').length,
    loanInstallments: rows(payload, 'loan_installments').length,
    attachments: expenses.filter((item) => Boolean(text(item.attachment_file))).length,
  }
}

async function clearOwnerData(ownerId: number): Promise<void> {
  await execute('DELETE FROM budgets WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM goals WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM internal_transfers WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM import_rules WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM loan_installments WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM loans WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM expenses WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM recurring_expenses WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM recurring_incomes WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM incomes WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM cards WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM accounts WHERE owner_id = ?', [ownerId])
  await execute('DELETE FROM categories WHERE owner_id = ?', [ownerId])
}

async function importCategories(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<number> {
  let count = 0

  for (const row of rows(payload, 'categories')) {
    const name = text(row.name).trim()
    const kind = text(row.kind, 'expense').trim() || 'expense'
    if (!name) continue

    let id = mode === 'merge'
      ? await findId(
          `SELECT id FROM categories
           WHERE owner_id = ? AND name = ? COLLATE NOCASE AND kind = ?
           LIMIT 1`,
          [ownerId, name, kind],
        )
      : 0

    if (!id) {
      id = await execute(
        `INSERT INTO categories(owner_id, name, kind, is_active)
         VALUES (?, ?, ?, ?)`,
        [ownerId, name, kind, booleanInteger(row.is_active)],
      )
      count += 1
    }

    remember(maps.categories, row, id)
  }

  return count
}

async function importAccounts(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<number> {
  let count = 0

  for (const row of rows(payload, 'accounts')) {
    const name = text(row.name).trim()
    if (!name) continue

    let id = mode === 'merge'
      ? await findId(
          `SELECT id FROM accounts
           WHERE owner_id = ? AND name = ? COLLATE NOCASE
           LIMIT 1`,
          [ownerId, name],
        )
      : 0

    if (!id) {
      id = await execute(
        `INSERT INTO accounts(
           owner_id, name, account_type, initial_balance, is_active, created_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          name,
          text(row.account_type, 'digital') || 'digital',
          numberValue(row.initial_balance),
          booleanInteger(row.is_active),
          text(row.created_at, new Date().toISOString()),
        ],
      )
      count += 1
    }

    remember(maps.accounts, row, id)
  }

  return count
}

async function importCards(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<number> {
  let count = 0

  for (const row of rows(payload, 'cards')) {
    const name = text(row.name).trim()
    const bank = text(row.bank).trim()
    if (!name) continue

    let id = mode === 'merge'
      ? await findId(
          `SELECT id FROM cards
           WHERE owner_id = ? AND name = ? COLLATE NOCASE AND bank = ? COLLATE NOCASE
           LIMIT 1`,
          [ownerId, name, bank],
        )
      : 0

    if (!id) {
      id = await execute(
        `INSERT INTO cards(
           owner_id, name, bank, brand, credit_limit, closing_day, due_day,
           payment_account_id, color, is_active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          name,
          bank,
          text(row.brand),
          numberValue(row.credit_limit),
          numberValue(row.closing_day, 1),
          numberValue(row.due_day, 10),
          mappedId(maps.accounts, row.payment_account_id),
          text(row.color, '#22c55e') || '#22c55e',
          booleanInteger(row.is_active),
        ],
      )
      count += 1
    }

    remember(maps.cards, row, id)
  }

  return count
}

async function importRecurringIncomes(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<number> {
  let count = 0
  for (const row of rows(payload, 'recurring_incomes')) {
    const description = text(row.description).trim()
    const startMonth = text(row.start_month).trim()
    const expectedDay = numberValue(row.expected_day, 1)
    if (!description || !startMonth) continue
    let id = mode === 'merge' ? await findId(
      `SELECT id FROM recurring_incomes WHERE owner_id=? AND description=? AND start_month=? AND expected_day=? LIMIT 1`,
      [ownerId, description, startMonth, expectedDay],
    ) : 0
    if (!id) {
      id = await execute(
        `INSERT INTO recurring_incomes(owner_id,description,amount,expected_day,category_id,account_id,notes,start_month,end_month,active)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [ownerId, description, numberValue(row.amount), expectedDay, mappedId(maps.categories,row.category_id), mappedId(maps.accounts,row.account_id), text(row.notes), startMonth, nullableText(row.end_month), booleanInteger(row.active)],
      )
      count += 1
    }
    remember(maps.recurringIncomes, row, id)
  }
  return count
}

async function importIncomes(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<number> {
  let count = 0

  for (const row of rows(payload, 'incomes')) {
    const description = text(row.description).trim()
    const expectedDate = text(row.expected_date).trim()
    const expectedAmount = numberValue(row.amount_expected)
    if (!description || !expectedDate) continue

    const externalId = nullableText(row.external_id)
    const existing = mode === 'merge'
      ? await findId(
          externalId
            ? `SELECT id FROM incomes WHERE owner_id = ? AND external_id = ? LIMIT 1`
            : `SELECT id FROM incomes WHERE owner_id = ? AND description = ? AND expected_date = ? AND amount_expected = ? LIMIT 1`,
          externalId ? [ownerId, externalId] : [ownerId, description, expectedDate, expectedAmount],
        )
      : 0

    if (existing) continue

    await execute(
      `INSERT INTO incomes(
         owner_id, description, amount_expected, amount_received, expected_date,
         received_date, status, account_id, category_id, notes, recurrence_id, external_id, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ownerId,
        description,
        expectedAmount,
        numberValue(row.amount_received),
        expectedDate,
        nullableText(row.received_date),
        text(row.status, 'pending') || 'pending',
        mappedId(maps.accounts, row.account_id),
        mappedId(maps.categories, row.category_id),
        text(row.notes),
        mappedId(maps.recurringIncomes, row.recurrence_id),
        externalId,
        text(row.created_at, new Date().toISOString()),
      ],
    )
    count += 1
  }

  return count
}

async function importRecurringExpenses(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<number> {
  let count = 0

  for (const row of rows(payload, 'recurring_expenses')) {
    const description = text(row.description).trim()
    const startMonth = text(row.start_month).trim()
    const dueDay = numberValue(row.due_day, 1)
    if (!description || !startMonth) continue

    let id = mode === 'merge'
      ? await findId(
          `SELECT id FROM recurring_expenses
           WHERE owner_id = ? AND description = ? AND start_month = ? AND due_day = ?
           LIMIT 1`,
          [ownerId, description, startMonth, dueDay],
        )
      : 0

    if (!id) {
      id = await execute(
        `INSERT INTO recurring_expenses(
           owner_id, description, amount, due_day, category_id, payment_method,
           merchant, account_id, start_month, end_month, active
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          description,
          numberValue(row.amount),
          dueDay,
          mappedId(maps.categories, row.category_id),
          text(row.payment_method, 'pix') || 'pix',
          text(row.merchant),
          mappedId(maps.accounts, row.account_id),
          startMonth,
          nullableText(row.end_month),
          booleanInteger(row.active),
        ],
      )
      count += 1
    }

    remember(maps.recurringExpenses, row, id)
  }

  return count
}

async function importLoans(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<number> {
  let count = 0

  for (const row of rows(payload, 'loans')) {
    const creditor = text(row.creditor).trim()
    const firstDueDate = text(row.first_due_date).trim()
    const totalAmount = numberValue(row.total_amount)
    if (!creditor || !firstDueDate) continue

    let id = mode === 'merge'
      ? await findId(
          `SELECT id FROM loans
           WHERE owner_id = ? AND creditor = ? AND total_amount = ? AND first_due_date = ?
           LIMIT 1`,
          [ownerId, creditor, totalAmount, firstDueDate],
        )
      : 0

    if (!id) {
      id = await execute(
        `INSERT INTO loans(
           owner_id, creditor, principal_amount, total_amount, interest_rate,
           installment_count, installment_amount, first_due_date, notes, active,
           created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          creditor,
          numberValue(row.principal_amount),
          totalAmount,
          numberValue(row.interest_rate),
          numberValue(row.installment_count),
          numberValue(row.installment_amount),
          firstDueDate,
          text(row.notes),
          booleanInteger(row.active),
          text(row.created_at, new Date().toISOString()),
        ],
      )
      count += 1
    }

    remember(maps.loans, row, id)
  }

  return count
}

async function importExpenses(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
  attachmentJobs: AttachmentJob[],
): Promise<number> {
  let count = 0

  for (const row of rows(payload, 'expenses')) {
    const description = text(row.description).trim()
    const dueDate = text(row.due_date).trim()
    const purchaseDate = text(row.purchase_date, dueDate).trim()
    const amount = numberValue(row.amount)
    if (!description || !dueDate || !purchaseDate) continue

    const externalId = nullableText(row.external_id)
    let id = mode === 'merge'
      ? await findId(
          externalId
            ? `SELECT id FROM expenses WHERE owner_id = ? AND external_id = ? LIMIT 1`
            : `SELECT id FROM expenses WHERE owner_id = ? AND description = ? AND purchase_date = ? AND due_date = ? AND amount = ? AND COALESCE(installment_number, 0) = ? LIMIT 1`,
          externalId ? [ownerId, externalId] : [ownerId, description, purchaseDate, dueDate, amount, numberValue(row.installment_number)],
        )
      : 0

    if (!id) {
      const billingMonth = text(row.billing_month).trim() || dueDate.slice(0, 7)
      const importedCardId = mappedId(maps.cards, row.card_id)
      const listMonth = dueDate.slice(0, 7)

      id = await execute(
        `INSERT INTO expenses(
           owner_id, description, amount, purchase_date, due_date, paid_date,
           category_id, expense_type, payment_method, merchant, notes, status,
           account_id, card_id, attachment_path, recurrence_id, installment_group,
           installment_number, total_installments, billing_month, list_month,
           external_id, created_at
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         )`,
        [
          ownerId,
          description,
          amount,
          purchaseDate,
          dueDate,
          nullableText(row.paid_date),
          mappedId(maps.categories, row.category_id),
          text(row.expense_type, 'variable') || 'variable',
          text(row.payment_method, 'pix') || 'pix',
          text(row.merchant),
          text(row.notes),
          text(row.status, 'pending') || 'pending',
          mappedId(maps.accounts, row.account_id),
          importedCardId,
          null,
          mappedId(maps.recurringExpenses, row.recurrence_id),
          nullableText(row.installment_group),
          optionalNumber(row.installment_number),
          optionalNumber(row.total_installments),
          billingMonth,
          listMonth,
          externalId,
          text(row.created_at, new Date().toISOString()),
        ],
      )
      count += 1
    }

    const archiveName = text(row.attachment_file).trim()
    const extension = archiveName ? safeExtension(archiveName) : null
    if (archiveName && extension) {
      attachmentJobs.push({ expenseId: id, archiveName, extension })
    }
  }

  return count
}

async function importLoanInstallments(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<number> {
  let count = 0

  for (const row of rows(payload, 'loan_installments')) {
    const loanId = mappedId(maps.loans, row.loan_id)
    const installmentNumber = numberValue(row.installment_number)
    const dueDate = text(row.due_date).trim()
    if (!loanId || !installmentNumber || !dueDate) continue

    const existing = mode === 'merge'
      ? await findId(
          `SELECT id FROM loan_installments
           WHERE owner_id = ? AND loan_id = ? AND installment_number = ?
           LIMIT 1`,
          [ownerId, loanId, installmentNumber],
        )
      : 0

    if (existing) continue

    await execute(
      `INSERT INTO loan_installments(
         loan_id, owner_id, installment_number, due_date, amount, status,
         paid_date, account_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loanId,
        ownerId,
        installmentNumber,
        dueDate,
        numberValue(row.amount),
        text(row.status, 'pending') || 'pending',
        nullableText(row.paid_date),
        mappedId(maps.accounts, row.account_id),
      ],
    )
    count += 1
  }

  return count
}

async function importAdvancedData(
  payload: TransferPayload,
  ownerId: number,
  mode: TransferImportMode,
  maps: IdMaps,
): Promise<{ budgets: number; goals: number; transfers: number; rules: number }> {
  const result = { budgets: 0, goals: 0, transfers: 0, rules: 0 }
  for (const row of rows(payload, 'budgets')) {
    const categoryId = mappedId(maps.categories, row.category_id)
    const month = text(row.month).trim()
    if (!categoryId || !month) continue
    const existing = mode === 'merge' ? await findId('SELECT id FROM budgets WHERE owner_id=? AND month=? AND category_id=? LIMIT 1', [ownerId, month, categoryId]) : 0
    if (existing) await execute('UPDATE budgets SET limit_amount=? WHERE id=? AND owner_id=?', [numberValue(row.limit_amount), existing, ownerId])
    else { await execute('INSERT INTO budgets(owner_id,month,category_id,limit_amount,created_at) VALUES (?,?,?,?,?)', [ownerId, month, categoryId, numberValue(row.limit_amount), text(row.created_at,new Date().toISOString())]); result.budgets += 1 }
  }
  for (const row of rows(payload, 'goals')) {
    const name = text(row.name).trim(); if (!name) continue
    const existing = mode === 'merge' ? await findId('SELECT id FROM goals WHERE owner_id=? AND name=? COLLATE NOCASE LIMIT 1', [ownerId, name]) : 0
    if (existing) await execute('UPDATE goals SET target_amount=?,current_amount=?,target_date=?,status=? WHERE id=? AND owner_id=?', [numberValue(row.target_amount),numberValue(row.current_amount),nullableText(row.target_date),text(row.status,'active'),existing,ownerId])
    else { await execute('INSERT INTO goals(owner_id,name,target_amount,current_amount,target_date,status,created_at) VALUES (?,?,?,?,?,?,?)', [ownerId,name,numberValue(row.target_amount),numberValue(row.current_amount),nullableText(row.target_date),text(row.status,'active'),text(row.created_at,new Date().toISOString())]); result.goals += 1 }
  }
  for (const row of rows(payload, 'internal_transfers')) {
    const fromId=mappedId(maps.accounts,row.from_account_id); const toId=mappedId(maps.accounts,row.to_account_id); const transferDate=text(row.transfer_date).trim(); const amount=numberValue(row.amount)
    if (!fromId || !toId || fromId===toId || !transferDate) continue
    const existing = mode === 'merge' ? await findId('SELECT id FROM internal_transfers WHERE owner_id=? AND from_account_id=? AND to_account_id=? AND transfer_date=? AND amount=? LIMIT 1',[ownerId,fromId,toId,transferDate,amount]) : 0
    if (!existing) { await execute('INSERT INTO internal_transfers(owner_id,from_account_id,to_account_id,amount,transfer_date,notes,created_at) VALUES (?,?,?,?,?,?,?)',[ownerId,fromId,toId,amount,transferDate,text(row.notes),text(row.created_at,new Date().toISOString())]); result.transfers += 1 }
  }
  for (const row of rows(payload, 'import_rules')) {
    const pattern=text(row.pattern).trim(); const kind=text(row.kind,'expense')||'expense'; if(!pattern) continue
    const existing=mode==='merge'?await findId('SELECT id FROM import_rules WHERE owner_id=? AND pattern=? COLLATE NOCASE AND kind=? LIMIT 1',[ownerId,pattern,kind]):0
    const categoryId=mappedId(maps.categories,row.category_id); const paymentMethod=text(row.payment_method,'pix')||'pix'
    if(existing) await execute('UPDATE import_rules SET category_id=?,payment_method=? WHERE id=? AND owner_id=?',[categoryId,paymentMethod,existing,ownerId])
    else { await execute('INSERT INTO import_rules(owner_id,pattern,kind,category_id,payment_method,created_at) VALUES (?,?,?,?,?,?)',[ownerId,pattern,kind,categoryId,paymentMethod,text(row.created_at,new Date().toISOString())]); result.rules += 1 }
  }
  return result
}

async function writeAttachments(
  files: Map<string, Uint8Array>,
  ownerId: number,
  batchId: string,
  jobs: AttachmentJob[],
): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0

  for (const job of jobs) {
    const archived = files.get(job.archiveName)
    if (!archived) {
      skipped += 1
      continue
    }

    try {
      const base64 = bytesToBase64(archived)
      const path = `SmartFinance/comprovantes/${ownerId}/importados/${batchId}/expense-${job.expenseId}.${job.extension}`

      await Filesystem.writeFile({
        path,
        data: base64,
        directory: Directory.Data,
        recursive: true,
      })

      await execute(
        'UPDATE expenses SET attachment_path = ? WHERE id = ? AND owner_id = ?',
        [path, job.expenseId, ownerId],
      )
      imported += 1
    } catch {
      skipped += 1
    }
  }

  return { imported, skipped }
}

export async function importTransferPackage(
  file: File,
  ownerId: number,
  mode: TransferImportMode,
): Promise<TransferImportResult> {
  if (!ownerId) {
    throw new Error('Não foi possível identificar o usuário que receberá os dados.')
  }

  const { files, payload } = await loadTransferPackage(file)
  await createMobileBackup(false)

  const maps: IdMaps = {
    categories: new Map(),
    accounts: new Map(),
    cards: new Map(),
    recurringExpenses: new Map(),
    recurringIncomes: new Map(),
    loans: new Map(),
  }

  const attachmentJobs: AttachmentJob[] = []
  const imported = {
    categories: 0,
    accounts: 0,
    cards: 0,
    incomes: 0,
    recurringExpenses: 0,
    recurringIncomes: 0,
    expenses: 0,
    loans: 0,
    loanInstallments: 0,
    budgets: 0,
    goals: 0,
    transfers: 0,
    rules: 0,
    attachments: 0,
  }

  await inTransaction(async (database) => {
    if (mode === 'replace') await clearOwnerData(ownerId)

    imported.categories = await importCategories(payload, ownerId, mode, maps)
    imported.accounts = await importAccounts(payload, ownerId, mode, maps)
    imported.cards = await importCards(payload, ownerId, mode, maps)
    imported.recurringIncomes = await importRecurringIncomes(payload, ownerId, mode, maps)
    imported.incomes = await importIncomes(payload, ownerId, mode, maps)
    imported.recurringExpenses = await importRecurringExpenses(payload, ownerId, mode, maps)
    imported.loans = await importLoans(payload, ownerId, mode, maps)
    imported.expenses = await importExpenses(payload, ownerId, mode, maps, attachmentJobs)
    imported.loanInstallments = await importLoanInstallments(payload, ownerId, mode, maps)
    const advanced = await importAdvancedData(payload, ownerId, mode, maps)
    imported.budgets = advanced.budgets
    imported.goals = advanced.goals
    imported.transfers = advanced.transfers
    imported.rules = advanced.rules

    if (rows(payload, 'categories').length === 0) {
      await seedCategories(database, ownerId)
    }
  })

  const batchId = new Date().toISOString().replace(/[:.]/g, '-')
  const attachments = await writeAttachments(files, ownerId, batchId, attachmentJobs)
  imported.attachments = attachments.imported

  return {
    backupCreated: true,
    imported,
    skippedAttachments: attachments.skipped,
  }
}

const SYNC_TABLES = [
  'categories', 'accounts', 'cards', 'incomes', 'recurring_incomes',
  'recurring_expenses', 'expenses', 'loans', 'loan_installments',
  'budgets', 'goals', 'internal_transfers', 'import_rules',
] as const

export async function exportSyncPackage(ownerId: number): Promise<{ message: string; name: string }> {
  if (!ownerId) throw new Error('Não foi possível identificar o usuário para sincronização.')
  const data: Record<string, Row[]> = {}
  for (const table of SYNC_TABLES) {
    data[table] = await queryRows<Row>(`SELECT * FROM ${table} WHERE owner_id = ?`, [ownerId])
  }
  const createdAt = new Date().toISOString()
  const filename = `smart-finance-sync-${createdAt.slice(0, 10)}-${createdAt.slice(11, 19).replace(/:/g, '-')}.sfsync`
  const content = JSON.stringify({ format: 'smart-finance-sync', version: 1, application_version: '0.5.3', created_at: createdAt, data }, null, 2)
  const { Encoding } = await import('@capacitor/filesystem')
  const { Share } = await import('@capacitor/share')
  let write: { uri: string }
  let location = 'Documentos/SmartFinance'
  try {
    write = await Filesystem.writeFile({ path: `SmartFinance/${filename}`, data: content, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true })
  } catch {
    write = await Filesystem.writeFile({ path: `sync/${filename}`, data: content, directory: Directory.Data, encoding: Encoding.UTF8, recursive: true })
    location = 'armazenamento interno do aplicativo'
  }
  try {
    await Share.share({ title: 'Sincronização Smart Finance', text: 'Pacote de sincronização do Smart Finance para importar no computador.', url: write.uri, dialogTitle: 'Enviar pacote para o computador' })
  } catch { /* pacote já foi salvo */ }
  return { message: `Pacote salvo em ${location}`, name: filename }
}
