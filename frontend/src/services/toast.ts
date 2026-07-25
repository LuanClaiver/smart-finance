export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export type ToastPayload = {
  id?: string
  kind: ToastKind
  title: string
  message?: string
  duration?: number
}

const EVENT_NAME = 'smart-finance-toast'

export function showToast(kind: ToastKind, title: string, message = '', duration = 3800): void {
  const detail: ToastPayload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    title,
    message,
    duration,
  }
  window.dispatchEvent(new CustomEvent<ToastPayload>(EVENT_NAME, { detail }))
}

export const toast = {
  success: (title: string, message = '', duration?: number) => showToast('success', title, message, duration),
  error: (title: string, message = '', duration?: number) => showToast('error', title, message, duration ?? 5200),
  info: (title: string, message = '', duration?: number) => showToast('info', title, message, duration),
  warning: (title: string, message = '', duration?: number) => showToast('warning', title, message, duration ?? 4600),
}

export function subscribeToToasts(listener: (payload: ToastPayload) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ToastPayload>).detail)
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
