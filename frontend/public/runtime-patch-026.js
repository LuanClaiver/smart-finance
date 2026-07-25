(() => {
  const PATCH_MARK = 'sf-runtime-026'
  if (window[PATCH_MARK]) return
  window[PATCH_MARK] = true

  let lastExpenseDueDate = ''

  // Captura a data mostrada na linha antes do React abrir o formulário de edição.
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null
    if (!button || button.textContent?.trim() !== 'Editar') return
    const row = button.closest('tr[data-expense-id]')
    if (!row) return
    const dueCell = row.querySelector('td:nth-child(2)')
    lastExpenseDueDate = dueCell?.textContent?.trim() || ''
  }, true)

  // Garante que o PATCH use a data escolhida no campo inserido no formulário.
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
      if (method === 'PATCH' && /\/api\/expenses\/\d+(?:\?|$)/.test(url) && typeof init.body === 'string') {
        const dueInput = document.querySelector('#expense-form input[name="due_date"]')
        if (dueInput instanceof HTMLInputElement && dueInput.value) {
          const payload = JSON.parse(init.body)
          payload.due_date = dueInput.value
          init = { ...init, body: JSON.stringify(payload) }
        }
      }
    } catch { /* mantém a chamada original */ }
    return originalFetch(input, init)
  }

  function enhanceExpenseEditor() {
    const form = document.querySelector('#expense-form')
    if (!(form instanceof HTMLFormElement)) return
    const title = form.querySelector('.form-title')?.textContent || ''
    if (!title.includes('Editar despesa')) return
    if (form.querySelector('input[name="due_date"]')) return

    const statusLabel = form.querySelector('select[name="status"]')?.closest('label')
    const label = document.createElement('label')
    label.className = 'runtime-due-date-field'
    label.innerHTML = '<span>Vencimento</span><input name="due_date" type="date" required>'
    const input = label.querySelector('input')
    if (input instanceof HTMLInputElement) input.value = /^\d{4}-\d{2}-\d{2}$/.test(lastExpenseDueDate) ? lastExpenseDueDate : ''
    if (statusLabel?.parentNode) statusLabel.parentNode.insertBefore(label, statusLabel)
    else form.appendChild(label)
  }

  function closeAlerts() {
    const notificationButton = document.querySelector('.notification-button')
    if (notificationButton instanceof HTMLButtonElement) notificationButton.click()
  }

  function enhanceAlertCenter() {
    const popover = document.querySelector('.alert-popover')
    const existingBackdrop = document.querySelector('.runtime-alert-backdrop')
    if (!popover) {
      existingBackdrop?.remove()
      return
    }

    if (!existingBackdrop) {
      const backdrop = document.createElement('div')
      backdrop.className = 'runtime-alert-backdrop'
      backdrop.setAttribute('aria-hidden', 'true')
      document.body.appendChild(backdrop)
    }

    const title = popover.querySelector('.popover-title')
    if (title && !title.querySelector('.runtime-alert-close')) {
      const close = document.createElement('button')
      close.type = 'button'
      close.className = 'popover-close runtime-alert-close'
      close.setAttribute('aria-label', 'Fechar alertas')
      close.textContent = '×'
      close.addEventListener('click', closeAlerts)
      title.appendChild(close)
    }
    popover.setAttribute('role', 'dialog')
    popover.setAttribute('aria-modal', 'true')
    popover.setAttribute('aria-label', 'Central de alertas')
  }

  const style = document.createElement('style')
  style.textContent = `
    .popover-close { width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--border)!important;border-radius:9px;background:transparent!important;color:#d7e9dc!important;font-size:1.15rem!important;line-height:1; }
    .runtime-alert-backdrop { display:none; }
    @media (max-width:590px) {
      .runtime-alert-backdrop { position:fixed;z-index:1190;inset:0;display:block;width:100%;height:100%;border:0;border-radius:0;background:rgb(1 8 4 / 58%);backdrop-filter:blur(4px); }
      .alert-popover { position:fixed!important;z-index:1200!important;left:10px!important;right:10px!important;top:auto!important;bottom:calc(78px + env(safe-area-inset-bottom))!important;width:auto!important;max-width:none!important;max-height:min(68dvh,560px)!important;padding:12px!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain;border-radius:18px!important;box-shadow:0 22px 75px rgb(0 0 0 / 72%)!important; }
      .popover-title { position:sticky;z-index:2;top:-12px;margin:-12px -12px 4px;padding:14px 14px 10px;background:linear-gradient(180deg,#0a1810 82%,rgb(10 24 16 / 92%));border-bottom:1px solid var(--border); }
      .alert-row,.alert-row strong,.alert-row span,.alert-row small,.alert-row em { min-width:0;overflow-wrap:anywhere; }
    }
  `
  document.head.appendChild(style)

  let scheduled = false
  const schedule = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      enhanceExpenseEditor()
      enhanceAlertCenter()
    })
  }
  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('hashchange', schedule)
  schedule()
})()
