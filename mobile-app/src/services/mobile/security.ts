import { Capacitor, registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const KEY_SETTINGS = 'smart-finance-security-settings-v1'
const KEY_PIN = 'smart-finance-security-pin-v1'

export type SecuritySettings = {
  enabled: boolean
  biometric: boolean
  timeoutMinutes: number
}

type BiometricPlugin = {
  isAvailable(): Promise<{ available: boolean; label?: string }>
  authenticate(options?: { title?: string; subtitle?: string }): Promise<{ success: boolean }>
}

const SmartFinanceBiometric = registerPlugin<BiometricPlugin>('SmartFinanceBiometric')

const DEFAULTS: SecuritySettings = { enabled: false, biometric: false, timeoutMinutes: 3 }

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`smart-finance-pin:${value}`)
  const result = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(result)].map((item) => item.toString(16).padStart(2, '0')).join('')
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const result = await Preferences.get({ key: KEY_SETTINGS })
  if (!result.value) return DEFAULTS
  try {
    const parsed = JSON.parse(result.value) as Partial<SecuritySettings>
    return { enabled: Boolean(parsed.enabled), biometric: Boolean(parsed.biometric), timeoutMinutes: Math.max(1, Math.min(30, Number(parsed.timeoutMinutes || 3))) }
  } catch { return DEFAULTS }
}

export async function saveSecuritySettings(settings: SecuritySettings): Promise<void> {
  await Preferences.set({ key: KEY_SETTINGS, value: JSON.stringify({ ...settings, timeoutMinutes: Math.max(1, Math.min(30, Number(settings.timeoutMinutes || 3))) }) })
}

export async function setSecurityPin(pin: string): Promise<void> {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('Use um PIN com 4 a 8 números.')
  await Preferences.set({ key: KEY_PIN, value: await digest(pin) })
}

export async function hasSecurityPin(): Promise<boolean> {
  return Boolean((await Preferences.get({ key: KEY_PIN })).value)
}

export async function verifySecurityPin(pin: string): Promise<boolean> {
  const stored = (await Preferences.get({ key: KEY_PIN })).value
  return Boolean(stored && stored === await digest(pin))
}

export async function biometricAvailability(): Promise<{ available: boolean; label: string }> {
  if (!Capacitor.isNativePlatform()) return { available: false, label: 'Biometria indisponível' }
  try {
    const result = await SmartFinanceBiometric.isAvailable()
    return { available: Boolean(result.available), label: result.label || 'Biometria' }
  } catch { return { available: false, label: 'Biometria indisponível' } }
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const result = await SmartFinanceBiometric.authenticate({ title: 'Desbloquear Smart Finance', subtitle: 'Confirme sua identidade para acessar seus dados financeiros.' })
    return Boolean(result.success)
  } catch { return false }
}
