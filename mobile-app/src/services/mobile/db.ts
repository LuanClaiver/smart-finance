import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite'
import { hashSecret } from './crypto'

const DATABASE_NAME = 'smart_finance_mobile'
const DATABASE_VERSION = 1
const sqlite = new SQLiteConnection(CapacitorSQLite)
let connectionPromise: Promise<SQLiteDBConnection> | null = null

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
  created_at TEXT NOT NULL
);
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
`

function nowIso(): string {
  return new Date().toISOString()
}

export async function getDb(): Promise<SQLiteDBConnection> {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      let database: SQLiteDBConnection
      const existing = await sqlite.isConnection(DATABASE_NAME, false)
      if (existing.result) database = await sqlite.retrieveConnection(DATABASE_NAME, false)
      else database = await sqlite.createConnection(DATABASE_NAME, false, 'no-encryption', DATABASE_VERSION, false)
      await database.open()
      await database.execute(SCHEMA)
      await seed(database)
      return database
    })().catch((error) => {
      connectionPromise = null
      throw error
    })
  }
  return connectionPromise
}

export async function closeDb(): Promise<void> {
  if (!connectionPromise) return
  await connectionPromise
  await sqlite.closeConnection(DATABASE_NAME, false)
  connectionPromise = null
}

export async function seedCategories(database: SQLiteDBConnection, userId: number): Promise<void> {
  const existing = await database.query('SELECT id FROM categories WHERE owner_id = ? LIMIT 1', [userId])
  if ((existing.values?.length || 0) > 0) return
  for (const name of EXPENSE_CATEGORIES) await database.run('INSERT INTO categories(owner_id, name, kind, is_active) VALUES (?, ?, ?, 1)', [userId, name, 'expense'])
  for (const name of INCOME_CATEGORIES) await database.run('INSERT INTO categories(owner_id, name, kind, is_active) VALUES (?, ?, ?, 1)', [userId, name, 'income'])
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
    )
    adminId = Number(created.changes?.lastId || 0)
  }
  if (adminId) await seedCategories(database, adminId)
  await database.run('INSERT OR REPLACE INTO app_meta(key, value) VALUES (?, ?)', ['schema_version', String(DATABASE_VERSION)])
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
  const result = await database.run(sql, values)
  return Number(result.changes?.lastId || 0)
}

export async function executeScript(sql: string): Promise<void> {
  const database = await getDb()
  await database.execute(sql)
}

export async function inTransaction<T>(work: (database: SQLiteDBConnection) => Promise<T>): Promise<T> {
  const database = await getDb()
  await database.beginTransaction()
  try {
    const result = await work(database)
    await database.commitTransaction()
    return result
  } catch (error) {
    await database.rollbackTransaction()
    throw error
  }
}

export { DATABASE_NAME }
