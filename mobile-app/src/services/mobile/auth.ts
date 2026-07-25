import type { User } from '../../types'
import { execute, queryOne, queryRows, seedCategories } from './db'
import { decodeJwtPayload, hashSecret, randomToken, verifySecret } from './crypto'
import { getDb } from './db'

export type GoogleIdentity = {
  sub: string
  email: string
  name: string
}

type UserRow = User & {
  password_hash?: string | null
  recovery_key_hash?: string | null
  google_sub?: string | null
}

export function publicUser(row: UserRow): User {
  return {
    id: Number(row.id),
    username: String(row.username),
    display_name: String(row.display_name),
    email: String(row.email),
    role: row.role === 'admin' ? 'admin' : 'user',
    is_active: Boolean(row.is_active),
    must_change_password: Boolean(row.must_change_password),
    created_at: String(row.created_at),
  }
}

export function createSession(userId: number): string {
  return `mobile.${userId}.${randomToken(24)}`
}

export function sessionUserId(token?: string | null): number | null {
  if (!token?.startsWith('mobile.')) return null
  const value = Number(token.split('.')[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

export async function getSessionUser(token?: string | null): Promise<UserRow | null> {
  const userId = sessionUserId(token)
  if (!userId) return null
  return queryOne<UserRow>('SELECT * FROM users WHERE id = ? AND is_active = 1', [userId])
}

export async function loginLocal(identifier: string, password: string): Promise<{ token: string; user: User }> {
  const normalized = identifier.trim()
  const row = await queryOne<UserRow>(
    'SELECT * FROM users WHERE (username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) AND is_active = 1 LIMIT 1',
    [normalized, normalized.toLowerCase()],
  )
  if (!row || !(await verifySecret(password, row.password_hash))) throw new Error('Usuário, e-mail ou senha inválidos')
  return { token: createSession(Number(row.id)), user: publicUser(row) }
}

export async function registerLocal(payload: Record<string, unknown>): Promise<{ token: string; user: User }> {
  const username = String(payload.username || '').trim()
  const displayName = String(payload.display_name || '').trim()
  const email = String(payload.email || '').trim().toLowerCase()
  const password = String(payload.password || '')
  const recoveryKey = String(payload.recovery_key || '')
  if (username.length < 3 || displayName.length < 2 || password.length < 4 || recoveryKey.length < 6 || !email.includes('@')) {
    throw new Error('Preencha corretamente os dados do cadastro.')
  }
  const exists = await queryOne<{ id: number }>('SELECT id FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE LIMIT 1', [username, email])
  if (exists) throw new Error('Nome de usuário ou e-mail já cadastrado')
  const id = await execute(
    `INSERT INTO users(username, display_name, email, password_hash, recovery_key_hash, role, is_active, must_change_password, created_at)
     VALUES (?, ?, ?, ?, ?, 'user', 1, 0, ?)`,
    [username, displayName, email, await hashSecret(password), await hashSecret(recoveryKey), new Date().toISOString()],
  )
  const database = await getDb()
  await seedCategories(database, id)
  const row = await queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id])
  if (!row) throw new Error('Não foi possível criar a conta.')
  return { token: createSession(id), user: publicUser(row) }
}

export async function recoverPassword(payload: Record<string, unknown>): Promise<{ message: string }> {
  const identifier = String(payload.identifier || '').trim()
  const key = String(payload.recovery_key || '')
  const newPassword = String(payload.new_password || '')
  const row = await queryOne<UserRow>('SELECT * FROM users WHERE username = ? COLLATE NOCASE OR email = ? COLLATE NOCASE LIMIT 1', [identifier, identifier.toLowerCase()])
  if (!row || !(await verifySecret(key, row.recovery_key_hash))) throw new Error('Dados de recuperação inválidos')
  await execute('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [await hashSecret(newPassword), row.id])
  return { message: 'Senha redefinida com sucesso' }
}

export async function changePassword(userId: number, payload: Record<string, unknown>): Promise<{ message: string; token: string }> {
  const row = await queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!row || !(await verifySecret(String(payload.current_password || ''), row.password_hash))) throw new Error('Senha atual incorreta')
  const newPassword = String(payload.new_password || '')
  if (newPassword.length < 4) throw new Error('A nova senha deve ter ao menos 4 caracteres.')
  await execute('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [await hashSecret(newPassword), userId])
  return { message: 'Senha alterada com sucesso', token: createSession(userId) }
}

export async function changeRecoveryKey(userId: number, payload: Record<string, unknown>): Promise<{ message: string }> {
  const row = await queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [userId])
  if (!row || !(await verifySecret(String(payload.current_password || ''), row.password_hash))) throw new Error('Senha atual incorreta')
  const newKey = String(payload.new_recovery_key || '')
  if (newKey.length < 6) throw new Error('A chave deve ter ao menos 6 caracteres.')
  await execute('UPDATE users SET recovery_key_hash = ? WHERE id = ?', [await hashSecret(newKey), userId])
  return { message: 'Chave de recuperação atualizada' }
}

function usernameBase(email: string): string {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 60)
  return base.length >= 3 ? base : `usuario${Date.now()}`
}

async function uniqueUsername(email: string): Promise<string> {
  const base = usernameBase(email)
  let candidate = base
  let suffix = 1
  while (await queryOne<{ id: number }>('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [candidate])) {
    suffix += 1
    candidate = `${base}${suffix}`
  }
  return candidate
}

export async function loginGoogleIdentity(identity: GoogleIdentity): Promise<{ token: string; user: User }> {
  let row = await queryOne<UserRow>('SELECT * FROM users WHERE google_sub = ? LIMIT 1', [identity.sub])
  if (!row) {
    row = await queryOne<UserRow>('SELECT * FROM users WHERE email = ? COLLATE NOCASE LIMIT 1', [identity.email.toLowerCase()])
    if (row) {
      await execute('UPDATE users SET google_sub = ?, display_name = CASE WHEN display_name = "" THEN ? ELSE display_name END WHERE id = ?', [identity.sub, identity.name, row.id])
    } else {
      const id = await execute(
        `INSERT INTO users(username, display_name, email, password_hash, recovery_key_hash, google_sub, role, is_active, must_change_password, created_at)
         VALUES (?, ?, ?, ?, NULL, ?, 'user', 1, 0, ?)`,
        [await uniqueUsername(identity.email), identity.name || identity.email, identity.email.toLowerCase(), await hashSecret(randomToken(32)), identity.sub, new Date().toISOString()],
      )
      const database = await getDb()
      await seedCategories(database, id)
    }
    row = await queryOne<UserRow>('SELECT * FROM users WHERE google_sub = ? LIMIT 1', [identity.sub])
  }
  if (!row || !row.is_active) throw new Error('Esta conta está desativada.')
  return { token: createSession(Number(row.id)), user: publicUser(row) }
}

export async function listUsers(): Promise<User[]> {
  const rows = await queryRows<UserRow>('SELECT * FROM users ORDER BY display_name COLLATE NOCASE')
  return rows.map(publicUser)
}

export function identityFromIdToken(idToken: string): GoogleIdentity {
  const payload = decodeJwtPayload<{ sub?: string; email?: string; name?: string; given_name?: string }>(idToken)
  if (!payload.sub || !payload.email) throw new Error('A Conta Google não retornou os dados necessários.')
  return { sub: payload.sub, email: payload.email, name: payload.name || payload.given_name || payload.email }
}
