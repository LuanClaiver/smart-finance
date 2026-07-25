import { Capacitor } from '@capacitor/core'
import { handleLocalApi, MobileApiError } from './mobile/localApi'
import { scheduleNativeAlerts } from './mobile/notifications'
import type { AlertItem } from '../types'

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

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const result = await handleLocalApi<T>(path, options, { token: getToken(), selectedOwnerId })
    const method = String(options.method || 'GET').toUpperCase()
    if (method !== 'GET' && !path.startsWith('/auth/') && path !== '/backups') {
      void handleLocalApi<AlertItem[]>('/alerts', {}, { token: getToken(), selectedOwnerId })
        .then(scheduleNativeAlerts)
        .catch(() => undefined)
    }
    return result
  } catch (error) {
    if (error instanceof MobileApiError) {
      if (error.status === 401) setToken(null)
      throw new ApiError(error.message, error.status)
    }
    const message = error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
    throw new ApiError(message, 500)
  }
}

export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform()
}

export const jsonBody = (value: unknown): RequestInit => ({ body: JSON.stringify(value) })

export function money(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
}

export function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function currentMonth(): string {
  return today().slice(0, 7)
}
