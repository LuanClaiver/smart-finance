import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import type { User } from '../../types'
import { identityFromIdToken, loginGoogleIdentity } from './auth'

let initialized = false

export function googleClientId(): string {
  return String(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '').trim()
}

export function googleIsConfigured(): boolean {
  const value = googleClientId()
  return value.endsWith('.apps.googleusercontent.com') && !value.startsWith('COLE_AQUI')
}

export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform()
}

async function initialize(): Promise<void> {
  if (initialized) return
  if (!isNativeMobile()) throw new Error('O login Google está disponível no aplicativo Android.')
  if (!googleIsConfigured()) throw new Error('Configure o ID de cliente Google antes de gerar o APK.')
  await SocialLogin.initialize({
    google: {
      webClientId: googleClientId(),
      mode: 'online',
    },
  })
  initialized = true
}

export async function loginWithGoogle(): Promise<{ token: string; user: User }> {
  await initialize()
  const response = await SocialLogin.login({
    provider: 'google',
    options: {
      scopes: ['email', 'profile'],
      filterByAuthorizedAccounts: false,
    },
  })
  const result = response.result as { idToken?: string; profile?: { id?: string; email?: string; name?: string } }
  if (result.idToken) return loginGoogleIdentity(identityFromIdToken(result.idToken))
  if (result.profile?.id && result.profile.email) {
    return loginGoogleIdentity({ sub: result.profile.id, email: result.profile.email, name: result.profile.name || result.profile.email })
  }
  throw new Error('O Google não retornou um token de identidade.')
}

export async function logoutGoogle(): Promise<void> {
  if (!initialized || !isNativeMobile()) return
  try { await SocialLogin.logout({ provider: 'google' }) } catch { /* sessão local já será encerrada */ }
}
