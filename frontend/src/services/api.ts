const API_BASE = '/api'
let selectedOwnerId: number | null = Number(localStorage.getItem('smart-finance-owner-id')) || null

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem('smart-finance-token')
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem('smart-finance-token', token)
  else localStorage.removeItem('smart-finance-token')
}

export function setSelectedOwnerId(ownerId: number | null): void {
  selectedOwnerId = ownerId
  if (ownerId) localStorage.setItem('smart-finance-owner-id', String(ownerId))
  else localStorage.removeItem('smart-finance-owner-id')
}

function withOwner(path: string): string {
  const excluded = ['/auth', '/admin', '/backups', '/health']
  if (!selectedOwnerId || excluded.some((prefix) => path.startsWith(prefix))) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}owner_id=${selectedOwnerId}`
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const method = (options.method || 'GET').toUpperCase()
  const cache = method === 'GET' ? 'no-store' : options.cache
  const response = await fetch(`${API_BASE}${withOwner(path)}`, { ...options, headers, cache })
  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.'
    try {
      const body = await response.json()
      message = body.detail || body.message || message
    } catch {
      // resposta sem JSON
    }
    if (response.status === 401) setToken(null)
    throw new ApiError(message, response.status)
  }
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return response.json() as Promise<T>
  return response.blob() as Promise<T>
}

export const jsonBody = (value: unknown): RequestInit => ({ body: JSON.stringify(value) })

export function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}
