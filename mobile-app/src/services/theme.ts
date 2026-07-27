export type AppTheme = 'dark' | 'light'

const THEME_KEY = 'smart-finance-theme'

export function getInitialTheme(): AppTheme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  localStorage.setItem(THEME_KEY, theme)
}
