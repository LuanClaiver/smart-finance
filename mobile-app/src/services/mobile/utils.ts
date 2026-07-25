export function todayLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addMonths(value: string, months: number): string {
  const [year, month, day] = value.split('-').map(Number)
  const target = new Date(year, month - 1 + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day || 1, lastDay))
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
}

export function monthOf(value: string): string {
  return value.slice(0, 7)
}

export function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

export function safeDate(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export function randomId(): string {
  return `${Date.now()}-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`
}

export function asNumber(value: unknown): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export function parseJsonBody(options: RequestInit): Record<string, unknown> {
  if (!options.body || typeof options.body !== 'string') return {}
  return JSON.parse(options.body) as Record<string, unknown>
}

export function boolInt(value: unknown): number {
  return value === true || value === 1 || value === '1' ? 1 : 0
}
