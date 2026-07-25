(() => {
  const PATCH_MARK = 'sf-runtime-025'
  if (window[PATCH_MARK]) return
  window[PATCH_MARK] = true

  const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]))
  const selectedOwnerId = () => Number(localStorage.getItem('smart-finance-owner-id')) || null

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {})
    const token = localStorage.getItem('smart-finance-token')
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    const ownerId = selectedOwnerId()
    const separator = path.includes('?') ? '&' : '?'
    const finalPath = ownerId ? `${path}${separator}owner_id=${ownerId}` : path
    const response = await fetch(`/api${finalPath}`, { ...options, headers, cache: 'no-store' })
    if (!response.ok) {
      let message = 'Não foi possível concluir a operação.'
      try { const data = await response.json(); message = data.detail || data.message || message } catch { /* sem JSON */ }
      throw new Error(message)
    }
    return response.json()
  }

  function toast(title, message, tone = 'success') {
    let host = document.querySelector('.runtime-toast-host')
    if (!host) {
      host = document.createElement('div')
      host.className = 'runtime-toast-host'
      document.body.appendChild(host)
    }
    const item = document.createElement('div')
    item.className = `runtime-toast ${tone}`
    item.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`
    host.appendChild(item)
    requestAnimationFrame(() => item.classList.add('show'))
    setTimeout(() => { item.classList.remove('show'); setTimeout(() => item.remove(), 250) }, 2600)
  }

  function closeModal(modal) {
    if (!modal) return
    modal.remove()
    document.body.style.overflow = ''
  }

  function openAccountModal(account) {
    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop runtime-account-modal'
    backdrop.innerHTML = `
      <div class="modal-shell" role="dialog" aria-modal="true" aria-label="Editar conta">
        <button type="button" class="modal-close" aria-label="Fechar">×</button>
        <form class="panel form-grid modal-form">
          <h3 class="form-title wide">Editar conta: ${escapeHtml(account.name)}</h3>
          <label>Nome<input name="name" required value="${escapeHtml(account.name)}"></label>
          <label>Tipo<select name="account_type">
            <option value="digital">Conta digital</option>
            <option value="checking">Conta corrente</option>
            <option value="savings">Poupança</option>
            <option value="wallet">Carteira</option>
            <option value="cash">Dinheiro</option>
          </select></label>
          <label>Saldo inicial<input name="initial_balance" type="number" step="0.01" value="${Number(account.initial_balance || 0)}"></label>
          <div class="form-actions"><button class="primary-button">Salvar alterações</button><button type="button" class="secondary-button runtime-cancel">Cancelar</button></div>
        </form>
      </div>`
    document.body.appendChild(backdrop)
    document.body.style.overflow = 'hidden'
    backdrop.querySelector('[name="account_type"]').value = account.account_type || 'digital'
    const close = () => closeModal(backdrop)
    backdrop.querySelector('.modal-close').addEventListener('click', close)
    backdrop.querySelector('.runtime-cancel').addEventListener('click', close)
    backdrop.addEventListener('mousedown', (event) => { if (event.target === backdrop) close() })
    const onKey = (event) => { if (event.key === 'Escape') { document.removeEventListener('keydown', onKey); close() } }
    document.addEventListener('keydown', onKey)
    backdrop.querySelector('form').addEventListener('submit', async (event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      const payload = {
        name: String(form.get('name') || '').trim(),
        account_type: String(form.get('account_type') || 'digital'),
        initial_balance: Number(form.get('initial_balance') || 0),
        is_active: true,
      }
      try {
        await api(`/accounts/${account.id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        close()
        toast('Conta atualizada', `${payload.name} foi atualizada.`)
        setTimeout(() => window.location.reload(), 450)
      } catch (error) {
        toast('Não foi possível atualizar a conta', error.message, 'error')
      }
    })
  }

  async function enhanceAccounts() {
    const heading = [...document.querySelectorAll('h1')].find((item) => item.textContent.trim() === 'Contas e carteiras')
    if (!heading) return
    const cards = [...document.querySelectorAll('.cards-list .list-card')]
    if (!cards.length || cards.every((card) => card.querySelector('.runtime-account-edit'))) return
    try {
      const accounts = await api('/accounts')
      cards.forEach((card, index) => {
        if (card.querySelector('.runtime-account-edit')) return
        const account = accounts[index]
        if (!account) return
        const deleteButton = [...card.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Excluir')
        if (!deleteButton) return
        let actions = card.querySelector('.account-card-actions')
        if (!actions) {
          actions = document.createElement('div')
          actions.className = 'account-card-actions'
          deleteButton.parentNode.insertBefore(actions, deleteButton)
          actions.appendChild(deleteButton)
        }
        const editButton = document.createElement('button')
        editButton.type = 'button'
        editButton.className = 'secondary-button compact runtime-account-edit'
        editButton.textContent = 'Editar'
        editButton.addEventListener('click', () => openAccountModal(account))
        actions.insertBefore(editButton, deleteButton)
      })
    } catch { /* a página original continuará funcional */ }
  }

  function progressCard({ title, completedLabel, pendingLabel, completed, total, tone }) {
    const percent = total > 0 ? Math.max(0, Math.min(100, completed / total * 100)) : 0
    const pending = Math.max(0, total - completed)
    return `<article class="progress-summary ${tone}">
      <div class="progress-summary-head"><div><span>${escapeHtml(title)}</span><strong>${Math.round(percent)}%</strong></div><small>${money(completed)} de ${money(total)}</small></div>
      <div class="progress-summary-track"><div class="progress-summary-fill" style="width:${percent}%"></div></div>
      <div class="progress-summary-values"><div><span>${escapeHtml(completedLabel)}</span><strong>${money(completed)}</strong></div><div><span>${escapeHtml(pendingLabel)}</span><strong>${money(pending)}</strong></div></div>
    </article>`
  }

  async function enhanceDashboard() {
    const heading = [...document.querySelectorAll('h1')].find((item) => item.textContent.trim() === 'Visão geral')
    if (!heading || document.querySelector('.progress-summary-list')) return
    const panels = document.querySelectorAll('.chart-grid .chart-panel')
    if (panels.length < 2 || panels[0].querySelector('.runtime-dashboard-content')) return
    const month = document.querySelector('.page-header input[type="month"]')?.value
    if (!month) return
    try {
      const [data, categories] = await Promise.all([api(`/dashboard?month=${encodeURIComponent(month)}`), api('/categories?kind=expense')])
      const names = new Map(categories.map((item) => [item.id, item.name]))
      const categoryRows = (data.by_category || []).map((item) => ({ name: names.get(item.category_id) || 'Sem categoria', total: Number(item.total || 0) })).sort((a, b) => b.total - a.total)
      const categoryTotal = categoryRows.reduce((sum, item) => sum + item.total, 0)

      panels[0].classList.add('runtime-enhanced-panel')
      const first = document.createElement('div')
      first.className = 'runtime-dashboard-content'
      first.innerHTML = `<div class="panel-heading-copy"><h3>Andamento do mês</h3><p>Veja claramente quanto já entrou ou foi pago e o que ainda falta.</p></div><div class="progress-summary-list">
        ${progressCard({ title: 'Recebimento das rendas', completedLabel: 'Recebido', pendingLabel: 'A receber', completed: Number(data.income_received), total: Number(data.income_expected), tone: 'income' })}
        ${progressCard({ title: 'Pagamento das despesas', completedLabel: 'Pago', pendingLabel: 'A pagar', completed: Number(data.expense_paid), total: Number(data.expense_expected), tone: 'expense' })}
      </div>`
      panels[0].appendChild(first)

      panels[1].classList.add('runtime-enhanced-panel')
      const second = document.createElement('div')
      second.className = 'runtime-dashboard-content'
      const rows = categoryRows.map((item) => {
        const percent = categoryTotal > 0 ? item.total / categoryTotal * 100 : 0
        return `<div class="category-progress-row"><div class="category-progress-head"><span>${escapeHtml(item.name)}</span><strong>${money(item.total)}</strong></div><div class="category-progress-track"><div class="category-progress-fill" style="width:${Math.max(percent, item.total > 0 ? 2 : 0)}%"></div></div><small>${Math.round(percent)}% das despesas do mês</small></div>`
      }).join('')
      second.innerHTML = `<div class="panel-heading-copy"><h3>Despesas por categoria</h3><p>Participação de cada categoria no total de ${money(categoryTotal)}.</p></div>${rows ? `<div class="category-progress-list">${rows}</div>` : '<p class="empty">Nenhuma despesa registrada.</p>'}`
      panels[1].appendChild(second)
    } catch { /* mantém a visualização original */ }
  }

  let scheduled = false
  function scheduleEnhancements() {
    if (scheduled) return
    scheduled = true
    setTimeout(() => {
      scheduled = false
      void enhanceAccounts()
      void enhanceDashboard()
    }, 80)
  }

  const observer = new MutationObserver(scheduleEnhancements)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('hashchange', scheduleEnhancements)
  document.addEventListener('change', (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'month') setTimeout(scheduleEnhancements, 180)
  })
  scheduleEnhancements()
})()
