export type ConfirmTone = 'danger' | 'warning' | 'default'

export type ConfirmRequest = {
  id: string
  title: string
  message: string
  detail?: string
  confirmLabel: string
  cancelLabel: string
  tone: ConfirmTone
  resolve: (confirmed: boolean) => void
}

export type ConfirmOptions = {
  title: string
  message: string
  detail?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

const EVENT_NAME = 'smart-finance-confirm'

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const detail: ConfirmRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: options.title,
      message: options.message,
      detail: options.detail,
      confirmLabel: options.confirmLabel || 'Confirmar',
      cancelLabel: options.cancelLabel || 'Cancelar',
      tone: options.tone || 'default',
      resolve,
    }
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(EVENT_NAME, { detail }))
  })
}

export function subscribeToConfirmations(listener: (request: ConfirmRequest) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ConfirmRequest>).detail)
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
