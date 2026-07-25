(() => {
  const PATCH_MARK = 'sf-runtime-034'
  if (window[PATCH_MARK]) return
  window[PATCH_MARK] = true

  function getToken() {
    return localStorage.getItem('smart-finance-token') || ''
  }

  function withOwner(path) {
    const ownerId = Number(localStorage.getItem('smart-finance-owner-id')) || 0
    if (!ownerId || path.startsWith('/api/backups')) return path
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}owner_id=${ownerId}`
  }

  async function apiFetch(path, options = {}) {
    const headers = new Headers(options.headers || {})
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const response = await fetch(withOwner(path), { ...options, headers, cache: 'no-store' })
    if (!response.ok) {
      let message = 'Não foi possível concluir a operação.'
      try {
        const body = await response.json()
        message = body.detail || body.message || message
      } catch { /* resposta sem JSON */ }
      throw new Error(message)
    }
    return response
  }

  function toastMessage(title, message, kind = 'success') {
    window.dispatchEvent(new CustomEvent('smart-finance-toast', { detail: { kind, title, message, duration: 4200 } }))
  }

  function enhanceIncomeForm() {
    const form = document.querySelector('#income-form')
    if (!(form instanceof HTMLFormElement) || form.dataset.runtime034 === '1') return
    form.dataset.runtime034 = '1'

    const expected = form.querySelector('input[name="amount_expected"]')
    const expectedLabel = expected?.closest('label')
    if (expectedLabel?.firstChild) expectedLabel.firstChild.textContent = 'Valor'

    for (const name of ['amount_received', 'received_date', 'status']) {
      const field = form.querySelector(`[name="${name}"]`)
      const label = field?.closest('label')
      if (label instanceof HTMLElement) label.style.display = 'none'
    }

    form.addEventListener('submit', () => {
      const amount = form.querySelector('input[name="amount_expected"]')
      const received = form.querySelector('input[name="amount_received"]')
      const receivedDate = form.querySelector('input[name="received_date"]')
      const status = form.querySelector('select[name="status"]')
      const isReceived = status instanceof HTMLSelectElement && status.value === 'received'
      if (amount instanceof HTMLInputElement && received instanceof HTMLInputElement) {
        received.value = isReceived ? amount.value : '0'
      }
      if (receivedDate instanceof HTMLInputElement) {
        receivedDate.value = isReceived ? (receivedDate.value || new Date().toISOString().slice(0, 10)) : ''
      }
    })
  }

  function enhanceIncomeTable() {
    const table = document.querySelector('.incomes-table table')
    if (!(table instanceof HTMLTableElement)) return
    const headings = table.querySelectorAll('thead th')
    if (headings[2]) headings[2].textContent = 'Valor'
    table.querySelectorAll('button').forEach((button) => {
      if (button.textContent?.trim() === 'Receber') button.textContent = 'Recebido'
    })
  }

  async function exportDatabase(button) {
    const original = button.textContent
    button.disabled = true
    button.textContent = 'Exportando...'
    try {
      const response = await apiFetch('/api/backups/export-database')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `smart-finance-${new Date().toISOString().slice(0, 10)}.db`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toastMessage('Banco de dados exportado', 'O arquivo SQLite foi enviado para a pasta Downloads do navegador.')
    } catch (error) {
      toastMessage('Não foi possível exportar o banco', error instanceof Error ? error.message : 'Erro desconhecido', 'error')
    } finally {
      button.disabled = false
      button.textContent = original
    }
  }

  function enhanceSettings() {
    const panels = [...document.querySelectorAll('.settings-grid .panel')]
    if (!panels.length) return

    const localPanel = panels.find((panel) => {
      const title = panel.querySelector('h3')?.textContent?.trim().toLowerCase()
      return title === 'acesso local' || title === 'aplicativo local'
    })
    if (localPanel && localPanel.dataset.runtime034 !== '1') {
      localPanel.dataset.runtime034 = '1'
      localPanel.classList.add('developer-panel')
      localPanel.innerHTML = `
        <h3>Sobre o aplicativo</h3>
        <p>Aplicativo desenvolvido por Luan Claiver 2026</p>
        <a class="secondary-button github-project-button" href="https://github.com/LuanClaiver/smart-finance" target="_blank" rel="noreferrer">Abrir projeto no GitHub</a>
      `
    }

    const backupPanel = panels.find((panel) => panel.querySelector('h3')?.textContent?.trim().toLowerCase().includes('backup'))
    if (backupPanel && !backupPanel.querySelector('.runtime-export-database')) {
      const title = backupPanel.querySelector('h3')
      if (title) title.textContent = 'Backup e banco de dados'
      const row = document.createElement('div')
      row.className = 'settings-button-row runtime-settings-buttons'
      const existingButton = backupPanel.querySelector('button')
      if (existingButton) row.appendChild(existingButton)
      const exportButton = document.createElement('button')
      exportButton.type = 'button'
      exportButton.className = 'primary-button runtime-export-database'
      exportButton.textContent = 'Exportar banco de dados'
      exportButton.addEventListener('click', () => exportDatabase(exportButton))
      row.appendChild(exportButton)
      const list = backupPanel.querySelector('.backup-list')
      backupPanel.insertBefore(row, list || null)
    }
  }

  function formatDate(value) {
    if (!value) return 'Não informada'
    const [year, month, day] = String(value).split('-')
    return year && month && day ? `${day}/${month}/${year}` : value
  }

  function money(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
  }

  function paymentMethod(value, hasCard) {
    if (hasCard) return 'Cartão de crédito'
    return ({ pix: 'Pix', debit: 'Débito', cash: 'Dinheiro', transfer: 'Transferência', boleto: 'Boleto' })[value] || value || 'Não informada'
  }

  let runtimeAttachmentUrl = ''

  function closeRuntimeModal() {
    if (runtimeAttachmentUrl) { URL.revokeObjectURL(runtimeAttachmentUrl); runtimeAttachmentUrl = '' }
    document.querySelector('.runtime-expense-backdrop')?.remove()
    document.body.classList.remove('modal-open')
  }

  async function openExpenseDetails(row) {
    const id = Number(row.dataset.expenseId)
    if (!id || document.querySelector('.runtime-expense-backdrop')) return
    const monthInput = document.querySelector('input[type="month"]')
    const month = monthInput instanceof HTMLInputElement ? monthInput.value : new Date().toISOString().slice(0, 7)

    const backdrop = document.createElement('div')
    backdrop.className = 'modal-backdrop runtime-expense-backdrop'
    backdrop.innerHTML = '<div class="modal-shell wide"><button class="modal-close" type="button" aria-label="Fechar">×</button><article class="panel expense-detail-panel"><p class="muted-text">Carregando detalhes...</p></article></div>'
    document.body.appendChild(backdrop)
    document.body.classList.add('modal-open')
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeRuntimeModal() })
    backdrop.querySelector('.modal-close')?.addEventListener('click', closeRuntimeModal)

    try {
      const response = await apiFetch(`/api/expenses?month=${encodeURIComponent(month)}&refresh=${Date.now()}`)
      const items = await response.json()
      const item = items.find((entry) => Number(entry.id) === id)
      if (!item) throw new Error('Despesa não encontrada.')

      const panel = backdrop.querySelector('.expense-detail-panel')
      const attachmentBlock = item.attachment_path
        ? '<p class="muted-text runtime-attachment-loading">Carregando comprovante...</p>'
        : '<p class="muted-text">Nenhum comprovante anexado.</p>'
      panel.innerHTML = `
        <div class="expense-detail-header"><div><small>Despesa</small><h3>${String(item.description || '').replace(/[<>&"]/g, '')}</h3></div><span class="status ${item.status}">${item.status === 'paid' ? 'Paga' : 'Pendente'}</span></div>
        <dl class="expense-detail-grid">
          <div><dt>Valor</dt><dd>${money(item.amount)}</dd></div>
          <div><dt>Vencimento</dt><dd>${formatDate(item.due_date)}</dd></div>
          <div><dt>Forma de pagamento</dt><dd>${paymentMethod(item.payment_method, item.card_id)}</dd></div>
          <div><dt>Estabelecimento</dt><dd>${item.merchant || 'Não informado'}</dd></div>
          ${item.paid_date ? `<div><dt>Data do pagamento</dt><dd>${formatDate(item.paid_date)}</dd></div>` : ''}
          ${item.installment_number ? `<div><dt>Parcela</dt><dd>${item.installment_number}/${item.total_installments}</dd></div>` : ''}
        </dl>
        ${item.notes ? `<div class="expense-detail-notes"><strong>Observações</strong><p>${String(item.notes).replace(/[<>&]/g, '')}</p></div>` : ''}
        <section class="expense-attachment-preview"><h4>Comprovante</h4>${attachmentBlock}</section>
        <div class="form-actions"><button class="secondary-button runtime-close-detail" type="button">Fechar</button></div>
      `
      panel.querySelector('.runtime-close-detail')?.addEventListener('click', closeRuntimeModal)

      if (item.attachment_path) {
        try {
          const attachmentResponse = await apiFetch(`/api/expenses/${id}/attachment`)
          const blob = await attachmentResponse.blob()
          const url = URL.createObjectURL(blob)
          runtimeAttachmentUrl = url
          const container = panel.querySelector('.expense-attachment-preview')
          container.querySelector('.runtime-attachment-loading')?.remove()
          if (String(item.attachment_path).toLowerCase().endsWith('.pdf')) {
            const link = document.createElement('a')
            link.className = 'secondary-button attachment-open-button'
            link.href = url
            link.target = '_blank'
            link.rel = 'noreferrer'
            link.textContent = 'Abrir comprovante em PDF'
            container.appendChild(link)
          } else {
            const image = document.createElement('img')
            image.className = 'expense-attachment-image'
            image.src = url
            image.alt = `Comprovante de ${item.description}`
            container.appendChild(image)
          }
        } catch (error) {
          const loading = panel.querySelector('.runtime-attachment-loading')
          if (loading) loading.textContent = error instanceof Error ? error.message : 'Não foi possível abrir o comprovante.'
        }
      }
    } catch (error) {
      const panel = backdrop.querySelector('.expense-detail-panel')
      panel.innerHTML = `<div class="form-error">${error instanceof Error ? error.message : 'Não foi possível abrir os detalhes.'}</div><div class="form-actions"><button class="secondary-button runtime-close-detail" type="button">Fechar</button></div>`
      panel.querySelector('.runtime-close-detail')?.addEventListener('click', closeRuntimeModal)
    }
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    const row = target?.closest('tr[data-expense-id]')
    if (!row || target.closest('.row-actions,button,label,input,select,a')) return
    openExpenseDetails(row)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.querySelector('.runtime-expense-backdrop')) closeRuntimeModal()
  })

  const style = document.createElement('style')
  style.textContent = `
    .incomes-table th:nth-child(4),.incomes-table td:nth-child(4){display:none!important}
    tr[data-expense-id]{cursor:pointer}
    tr[data-expense-id]:hover td{background-color:rgb(34 197 94 / 4%)}
  `
  document.head.appendChild(style)

  let scheduled = false
  function enhance() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      enhanceIncomeForm()
      enhanceIncomeTable()
      enhanceSettings()
    })
  }

  const observer = new MutationObserver(enhance)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('hashchange', enhance)
  enhance()
})()
