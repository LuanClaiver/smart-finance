import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import { hashSecret } from './crypto'

const DATABASE_NAME = 'smart_finance_mobile'
const DATABASE_VERSION = 1
const sqlite = new SQLiteConnection(CapacitorSQLite)
let connectionPromise: Promise<SQLiteDBConnection> | null = null
// Serializa abertura e fechamento. Isso evita que uma nova conexão seja criada
// enquanto a anterior ainda está sendo encerrada após importação/recarregamento.
let connectionLifecycle: Promise<void> = Promise.resolve()

const EXPENSE_CATEGORIES = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Bebê',
  'Assinaturas', 'Cartões', 'Empréstimos', 'Contas domésticas', 'Compras',
  'Impostos e taxas', 'Cuidados pessoais', 'Presentes', 'Outros',
]
const INCOME_CATEGORIES = ['Salário', 'Renda extra', 'Benefício', 'Reembolso', 'Venda', 'Outros recebimentos']

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  recovery_key_hash TEXT,
  google_sub TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'expense',
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(owner_id, name, kind)
);
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'digital',
  initial_balance REAL NOT NULL DEFAULT 0,
  reported_balance REAL,
  balance_checked_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  credit_limit REAL NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL DEFAULT 1,
  due_day INTEGER NOT NULL DEFAULT 10,
  payment_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  color TEXT NOT NULL DEFAULT '#22c55e',
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS recurring_incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  expected_day INTEGER NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  start_month TEXT NOT NULL,
  end_month TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount_expected REAL NOT NULL DEFAULT 0,
  amount_received REAL NOT NULL DEFAULT 0,
  expected_date TEXT NOT NULL,
  received_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  notes TEXT NOT NULL DEFAULT '',
  recurrence_id INTEGER REFERENCES recurring_incomes(id) ON DELETE SET NULL,
  external_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_incomes_owner_recurrence ON incomes(owner_id, recurrence_id);
CREATE INDEX IF NOT EXISTS ix_incomes_owner_external ON incomes(owner_id, external_id);
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  due_day INTEGER NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  merchant TEXT NOT NULL DEFAULT '',
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  start_month TEXT NOT NULL,
  end_month TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  purchase_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  paid_date TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  expense_type TEXT NOT NULL DEFAULT 'variable',
  payment_method TEXT NOT NULL DEFAULT 'pix',
  merchant TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  card_id INTEGER REFERENCES cards(id) ON DELETE SET NULL,
  attachment_path TEXT,
  recurrence_id INTEGER REFERENCES recurring_expenses(id) ON DELETE SET NULL,
  installment_group TEXT,
  installment_number INTEGER,
  total_installments INTEGER,
  billing_month TEXT NOT NULL,
  list_month TEXT NOT NULL,
  external_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_expenses_owner_list_month ON expenses(owner_id, list_month);
CREATE INDEX IF NOT EXISTS ix_expenses_owner_billing_month ON expenses(owner_id, billing_month);
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creditor TEXT NOT NULL,
  principal_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  interest_rate REAL NOT NULL DEFAULT 0,
  installment_count INTEGER NOT NULL,
  installment_amount REAL NOT NULL,
  first_due_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS loan_installments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_date TEXT,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  limit_amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(owner_id, month, category_id)
);
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  current_amount REAL NOT NULL DEFAULT 0,
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS internal_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  transfer_date TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS import_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'expense',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  created_at TEXT NOT NULL,
  UNIQUE(owner_id, pattern, kind)
);
`

function nowIso(): string {
  return new Date().toISOString()
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error || '')
}

async function openDatabaseConnection(): Promise<SQLiteDBConnection> {
  // Uma recarga do WebView recria o objeto JavaScript, mas a conexão nativa pode
  // continuar viva. O plugin recomenda verificar a consistência antes de criar.
  await sqlite.checkConnectionsConsistency().catch(() => ({ result: false }))

  let database: SQLiteDBConnection
  const existing = await sqlite.isConnection(DATABASE_NAME, false).catch(() => ({ result: false }))

  if (existing.result) {
    database = await sqlite.retrieveConnection(DATABASE_NAME, false)
  } else {
    try {
      database = await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false)
    } catch (error) {
      // Recupera especificamente o estado em que a camada nativa informa que a
      // conexão já existe, mas o novo contexto JavaScript ainda não a conhece.
      const message = errorMessage(error).toLowerCase()
      if (!message.includes('already exists') && !message.includes('já existe')) throw error

      await sqlite.closeConnection(DATABASE_NAME, false).catch(() => undefined)
      await sqlite.checkConnectionsConsistency().catch(() => ({ result: false }))
      database = await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false)
    }
  }

  const opened = await database.isDBOpen().catch(() => ({ result: false }))
  if (!opened.result) await database.open()
  await database.execute(SCHEMA)
  // v0.5.0: adiciona colunas a bancos existentes sem apagar dados.
  const ensureColumn = async (table: string, column: string, definition: string) => {
    const info = await database.query(`PRAGMA table_info(${table})`)
    const exists = (info.values || []).some((row: Record<string, unknown>) => String(row.name) === column)
    if (!exists) await database.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`)
  }
  await ensureColumn('accounts', 'reported_balance', 'REAL')
  await ensureColumn('accounts', 'balance_checked_at', 'TEXT')
  await ensureColumn('incomes', 'recurrence_id', 'INTEGER')
  await ensureColumn('incomes', 'external_id', 'TEXT')
  await ensureColumn('expenses', 'external_id', 'TEXT')
  await database.execute(`
    CREATE INDEX IF NOT EXISTS ix_incomes_owner_recurrence ON incomes(owner_id, recurrence_id);
    CREATE INDEX IF NOT EXISTS ix_incomes_owner_external ON incomes(owner_id, external_id);
    CREATE INDEX IF NOT EXISTS ix_expenses_owner_external ON expenses(owner_id, external_id);
    INSERT OR REPLACE INTO app_meta(key, value) VALUES ('migration_0_5_0_financial_engine', 'applied');
  `)
  // 0.4.1: cartão passa a afetar o mês do vencimento da fatura. A correção é
  // idempotente para também normalizar bancos importados de versões anteriores.
  await database.execute(`
    UPDATE expenses
       SET list_month = substr(due_date, 1, 7)
     WHERE card_id IS NOT NULL
       AND due_date IS NOT NULL
       AND list_month <> substr(due_date, 1, 7);
    INSERT OR REPLACE INTO app_meta(key, value) VALUES ('migration_0_4_1_card_due_month', 'applied');
  `)
  // 0.4.2: mantém o alias de login "Admin" compatível com bancos antigos ou
  // importados sem alterar a senha atual do administrador.
  const canonicalAdmin = await database.query(
    'SELECT id, username FROM users WHERE email = ? COLLATE NOCASE AND role = ? LIMIT 1',
    ['admin@smartfinance.com', 'admin'],
  )
  const adminRow = canonicalAdmin.values?.[0]
  if (adminRow && String(adminRow.username || '').toLowerCase() !== 'admin') {
    const usernameOwner = await database.query('SELECT id FROM users WHERE username = ? COLLATE NOCASE LIMIT 1', ['Admin'])
    const conflictId = Number(usernameOwner.values?.[0]?.id || 0)
    if (!conflictId || conflictId === Number(adminRow.id)) {
      await database.run('UPDATE users SET username = ? WHERE id = ?', ['Admin', Number(adminRow.id)], false)
    }
  }
  await database.run('INSERT OR REPLACE INTO app_meta(key, value) VALUES (?, ?)', ['migration_0_4_2_admin_login_alias', 'applied'], false)
  // 0.4.3: qualquer despesa passa a pertencer ao mês do vencimento. A
  // atualização é idempotente e também corrige bancos importados/antigos.
  await database.execute(`
    UPDATE expenses
       SET list_month = substr(due_date, 1, 7)
     WHERE due_date IS NOT NULL
       AND (list_month IS NULL OR list_month <> substr(due_date, 1, 7));
    INSERT OR REPLACE INTO app_meta(key, value) VALUES ('migration_0_4_3_all_expenses_due_month', 'applied');
  `)
  await seed(database)
  return database
}

export async function getDb(): Promise<SQLiteDBConnection> {
  if (!connectionPromise) {
    connectionPromise = connectionLifecycle
      .then(() => openDatabaseConnection())
      .catch((error) => {
        connectionPromise = null
        throw error
      })
  }
  return connectionPromise
}

export async function closeDb(): Promise<void> {
  const pendingConnection = connectionPromise
  connectionPromise = null

  connectionLifecycle = connectionLifecycle.then(async () => {
    const database = pendingConnection ? await pendingConnection.catch(() => null) : null

    if (database) {
      const active = await database.isTransactionActive().catch(() => ({ result: false }))
      if (active.result) await database.rollbackTransaction().catch(() => undefined)
    }

    // closeConnection remove a conexão das camadas nativa e JavaScript. A
    // chamada também é segura como recuperação de uma conexão nativa órfã.
    await sqlite.closeConnection(DATABASE_NAME, false).catch(async () => {
      if (database) await database.close().catch(() => undefined)
    })
    await sqlite.checkConnectionsConsistency().catch(() => ({ result: false }))
  })

  await connectionLifecycle
}

export async function seedCategories(database: SQLiteDBConnection, userId: number): Promise<void> {
  const existing = await database.query('SELECT id FROM categories WHERE owner_id = ? LIMIT 1', [userId])
  if ((existing.values?.length || 0) > 0) return
  for (const name of EXPENSE_CATEGORIES) await database.run('INSERT INTO categories(owner_id, name, kind, is_active) VALUES (?, ?, ?, 1)', [userId, name, 'expense'], false)
  for (const name of INCOME_CATEGORIES) await database.run('INSERT INTO categories(owner_id, name, kind, is_active) VALUES (?, ?, ?, 1)', [userId, name, 'income'], false)
}

async function seed(database: SQLiteDBConnection): Promise<void> {
  const existing = await database.query('SELECT id FROM users WHERE username = ? COLLATE NOCASE LIMIT 1', ['Admin'])
  let adminId = Number(existing.values?.[0]?.id || 0)
  if (!adminId) {
    const passwordHash = await hashSecret('1234')
    const created = await database.run(
      `INSERT INTO users(username, display_name, email, password_hash, role, is_active, must_change_password, created_at)
       VALUES (?, ?, ?, ?, 'admin', 1, 1, ?)`,
      ['Admin', 'Administrador', 'admin@smartfinance.com', passwordHash, nowIso()],
      false,
    )
    adminId = Number(created.changes?.lastId || 0)
  }
  if (adminId) await seedCategories(database, adminId)
  await database.run('INSERT OR REPLACE INTO app_meta(key, value) VALUES (?, ?)', ['schema_version', String(DATABASE_VERSION)], false)
}

export function normalizeRow<T extends Record<string, unknown>>(row: T): T {
  const result = { ...row }
  const booleanKeys = ['is_active', 'must_change_password', 'active']
  for (const key of booleanKeys) {
    if (key in result) (result as Record<string, unknown>)[key] = Boolean(Number(result[key]))
  }
  return result
}

export async function queryRows<T extends Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
  const database = await getDb()
  const result = await database.query(sql, values)
  return (result.values || []).map((row: Record<string, unknown>) => normalizeRow(row as T))
}

export async function queryOne<T extends Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T | null> {
  const rows = await queryRows<T>(sql, values)
  return rows[0] || null
}

export async function execute(sql: string, values: unknown[] = []): Promise<number> {
  const database = await getDb()
  // Cada comando participa da transação externa quando houver uma. O terceiro
  // argumento false impede o plugin de tentar abrir outra transação por comando.
  const result = await database.run(sql, values, false)
  return Number(result.changes?.lastId || 0)
}

export async function executeScript(sql: string): Promise<void> {
  const database = await getDb()
  await database.execute(sql)
}

let transactionQueue: Promise<void> = Promise.resolve()

export async function inTransaction<T>(work: (database: SQLiteDBConnection) => Promise<T>): Promise<T> {
  const task = transactionQueue.then(async () => {
    const database = await getDb()

    // Recupera uma transação interrompida por uma execução anterior do APK.
    const previous = await database.isTransactionActive().catch(() => ({ result: false }))
    if (previous.result) await database.rollbackTransaction()

    await database.beginTransaction()
    try {
      const result = await work(database)
      await database.commitTransaction()
      return result
    } catch (error) {
      const active = await database.isTransactionActive().catch(() => ({ result: false }))
      if (active.result) await database.rollbackTransaction()
      throw error
    }
  })

  // Serializa importações e outras operações compostas no mesmo banco.
  transactionQueue = task.then(() => undefined, () => undefined)
  return task
}

export { DATABASE_NAME }
