(() => {
  const moneyNames = new Set([
    'amount',
    'initial_balance',
    'credit_limit',
    'principal_amount',
    'total_amount',
    'installment_amount',
  ])

  function parseMoney(raw) {
    let text = String(raw ?? '').trim().replace(/\s+/g, '').replace(/R\$/gi, '')
    if (!text) return 0
    const negative = text.startsWith('-')
    text = text.replace(/-/g, '').replace(/[^0-9,.]/g, '')
    if (!text) return 0

    let normalized = text
    if (text.includes(',')) {
      const lastComma = text.lastIndexOf(',')
      const integer = text.slice(0, lastComma).replace(/[.,]/g, '') || '0'
      const decimals = text.slice(lastComma + 1).replace(/\D/g, '').slice(0, 2)
      normalized = decimals ? `${integer}.${decimals}` : integer
    } else if (text.includes('.')) {
      const dots = (text.match(/\./g) || []).length
      const lastDot = text.lastIndexOf('.')
      const decimalCount = text.length - lastDot - 1
      if (!(dots === 1 && decimalCount > 0 && decimalCount <= 2)) normalized = text.replace(/\./g, '')
    }

    const result = Number(normalized)
    if (!Number.isFinite(result)) return 0
    return negative ? -result : result
  }

  function formatMoney(raw) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseMoney(raw))
  }

  function isMoneyInput(input) {
    return input instanceof HTMLInputElement && input.type !== 'hidden' && moneyNames.has(input.name)
  }

  function prepare(input) {
    if (!isMoneyInput(input) || input.dataset.money042 === '1') return
    input.dataset.money042 = '1'
    input.type = 'text'
    input.inputMode = 'decimal'
    input.placeholder ||= '0,00'
    if (input.value.trim()) input.value = formatMoney(input.value)

    input.addEventListener('focus', () => input.select())
    input.addEventListener('input', () => {
      const negativeAllowed = input.name === 'initial_balance'
      let value = input.value.replace(/[^0-9,.-]/g, '')
      if (!negativeAllowed) value = value.replace(/-/g, '')
      else value = `${value.startsWith('-') ? '-' : ''}${value.replace(/-/g, '')}`
      if (value !== input.value) input.value = value
    })
    input.addEventListener('blur', () => {
      if (input.value.trim()) input.value = formatMoney(input.value)
    })
  }

  function scan(root = document) {
    root.querySelectorAll?.('input').forEach(prepare)
  }

  document.addEventListener('submit', (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    const inputs = [...form.querySelectorAll('input')].filter(isMoneyInput)
    const formatted = inputs.map((input) => [input, input.value])
    inputs.forEach((input) => {
      if (input.value.trim()) input.value = String(parseMoney(input.value))
    })
    setTimeout(() => formatted.forEach(([input]) => {
      if (input.isConnected && input.value.trim()) input.value = formatMoney(input.value)
    }), 0)
  }, true)

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          if (node.matches('input')) prepare(node)
          scan(node)
        }
      })
    }
  })

  function start() {
    scan()
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
