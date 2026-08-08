import { type InputHTMLAttributes, useState } from 'react'

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'inputMode' | 'name' | 'defaultValue' | 'value' | 'onChange'> & {
  name: string
  defaultValue?: number | string | null
  allowNegative?: boolean
}

function normalizeTypedValue(value: string, allowNegative: boolean): string {
  let cleaned = value.replace(/[^0-9,.-]/g, '')
  if (!allowNegative) cleaned = cleaned.replace(/-/g, '')
  else cleaned = `${cleaned.startsWith('-') ? '-' : ''}${cleaned.replace(/-/g, '')}`
  return cleaned
}

export function parseMoneyInput(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  let text = String(value ?? '').trim().replace(/\s+/g, '').replace(/R\$/gi, '')
  if (!text) return 0

  const negative = text.startsWith('-')
  text = text.replace(/-/g, '').replace(/[^0-9,.]/g, '')
  if (!text) return 0

  let normalized = text
  if (text.includes(',')) {
    const lastComma = text.lastIndexOf(',')
    const integerPart = text.slice(0, lastComma).replace(/[.,]/g, '') || '0'
    const decimalPart = text.slice(lastComma + 1).replace(/[^0-9]/g, '').slice(0, 2)
    normalized = decimalPart ? `${integerPart}.${decimalPart}` : integerPart
  } else if (text.includes('.')) {
    const dots = (text.match(/\./g) || []).length
    const lastDot = text.lastIndexOf('.')
    const decimals = text.length - lastDot - 1
    if (dots === 1 && decimals > 0 && decimals <= 2) {
      normalized = text
    } else {
      normalized = text.replace(/\./g, '')
    }
  }

  const result = Number(normalized)
  if (!Number.isFinite(result)) return 0
  return negative ? -result : result
}

export function formatMoneyInput(value: unknown): string {
  const number = parseMoneyInput(value)
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number)
}

export default function MoneyInput({ name, defaultValue = '', allowNegative = false, onBlur, onFocus, ...props }: MoneyInputProps) {
  const hasDefault = defaultValue !== '' && defaultValue !== null && defaultValue !== undefined
  const [display, setDisplay] = useState(hasDefault ? formatMoneyInput(defaultValue) : '')
  const normalizedValue = display.trim() ? String(parseMoneyInput(display)) : ''

  return <>
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={props.placeholder || '0,00'}
      onChange={(event) => setDisplay(normalizeTypedValue(event.target.value, allowNegative))}
      onFocus={(event) => {
        event.currentTarget.select()
        onFocus?.(event)
      }}
      onBlur={(event) => {
        if (display.trim()) setDisplay(formatMoneyInput(display))
        onBlur?.(event)
      }}
    />
    <input type="hidden" name={name} value={normalizedValue} />
  </>
}
