export type NavigationTarget = {
  page: string
  itemId?: number
  month?: string
}

const allowedPages = new Set([
  'dashboard', 'incomes', 'expenses', 'accounts', 'cards', 'loans', 'planning', 'import', 'reports', 'admin', 'settings',
])

export function readNavigationTarget(expectedPage?: string): NavigationTarget {
  const raw = window.location.hash.replace(/^#/, '')
  const [rawPage, rawQuery = ''] = raw.split('?', 2)
  const page = allowedPages.has(rawPage) ? rawPage : 'dashboard'
  const params = new URLSearchParams(rawQuery)
  const itemValue = Number(params.get('item'))
  const monthValue = params.get('month') || undefined
  const target: NavigationTarget = {
    page,
    itemId: Number.isFinite(itemValue) && itemValue > 0 ? itemValue : undefined,
    month: monthValue && /^\d{4}-\d{2}$/.test(monthValue) ? monthValue : undefined,
  }
  if (expectedPage && target.page !== expectedPage) return { page: expectedPage }
  return target
}

export function navigateTo(page: string, itemId?: number, month?: string): void {
  const safePage = allowedPages.has(page) ? page : 'dashboard'
  const params = new URLSearchParams()
  if (itemId && itemId > 0) params.set('item', String(itemId))
  if (month && /^\d{4}-\d{2}$/.test(month)) params.set('month', month)
  const nextHash = `${safePage}${params.size ? `?${params.toString()}` : ''}`
  if (window.location.hash.replace(/^#/, '') === nextHash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = nextHash
  }
}

export function scrollToTarget(selector: string): void {
  window.requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(selector)
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    element.focus?.({ preventScroll: true })
  })
}
