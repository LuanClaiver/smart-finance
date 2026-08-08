(() => {
  const THEME_KEY = 'smart-finance-theme'

  function currentTheme() {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem(THEME_KEY, theme)
    const icon = theme === 'dark' ? '☀️' : '🌙'
    const title = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'
    document.querySelectorAll('[data-runtime-theme-toggle]').forEach((button) => {
      if (button.textContent !== icon) button.textContent = icon
      if (button.title !== title) button.title = title
      if (button.getAttribute('aria-label') !== title) button.setAttribute('aria-label', title)
    })
  }

  function toggleTheme() {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
  }

  function themeButton(extraClass = '') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `runtime-theme-toggle ${extraClass}`.trim()
    button.dataset.runtimeThemeToggle = 'true'
    button.addEventListener('click', toggleTheme)
    return button
  }

  function enhanceAuth() {
    const layout = document.querySelector('.auth-layout')
    const hero = layout?.querySelector('.auth-hero')
    const card = layout?.querySelector('.auth-card')
    if (!layout || !hero || !card) return

    const heroTitle = hero.querySelector('h1')
    const heroText = hero.querySelector(':scope > p')
    const desiredTitle = 'Organize hoje. Decida melhor amanhã.'
    const desiredText = 'Tenha rendas, despesas, contas, cartões e empréstimos em um só lugar, com dados locais e separados por usuário.'
    if (heroTitle && heroTitle.textContent !== desiredTitle) heroTitle.textContent = desiredTitle
    if (heroText && heroText.textContent !== desiredText) heroText.textContent = desiredText

    if (!hero.querySelector('.runtime-auth-badge')) {
      const badge = document.createElement('div')
      badge.className = 'runtime-auth-badge'
      badge.innerHTML = '<img src="/icon.svg" alt=""><span>Smart Finance <b>0.4.1</b></span>'
      hero.prepend(badge)
    }

    if (!card.querySelector('.runtime-auth-brand')) {
      const brand = document.createElement('div')
      brand.className = 'runtime-auth-brand'
      brand.innerHTML = '<div class="runtime-auth-brand-copy"><img src="/icon.svg" alt="Logo Smart Finance"><div><strong>Smart Finance</strong><small>Versão 0.4.1</small></div></div>'
      brand.appendChild(themeButton())
      card.prepend(brand)

      const heading = card.querySelector('h2')
      if (heading) {
        const eyebrow = document.createElement('div')
        eyebrow.className = 'runtime-auth-eyebrow'
        eyebrow.textContent = 'Acesso'
        heading.before(eyebrow)
      }
    }

    const heading = card.querySelector('h2')
    if (heading && heading.textContent?.trim() === 'Entrar') heading.textContent = 'Entrar no sistema'

    const isLogin = heading?.textContent?.trim() === 'Entrar no sistema'
    layout.classList.add('runtime-auth-notes-style')
    layout.classList.toggle('runtime-auth-login', Boolean(isLogin))

    card.querySelectorAll('.auth-links button').forEach((button) => {
      const label = button.textContent?.trim()
      if (label === 'Criar conta') button.textContent = 'Criar uma nova conta'
      if (label === 'Esqueci a senha') button.textContent = 'Esqueci minha senha'
    })
  }

  function enhanceShell() {
    const sidebar = document.querySelector('.sidebar')
    const brand = sidebar?.querySelector('.brand')
    if (sidebar && brand && !sidebar.querySelector('[data-runtime-theme-toggle]')) {
      brand.after(themeButton())
    }

    const shell = document.querySelector('.app-shell')
    const main = shell?.querySelector('.main-content')
    if (shell && main && !shell.querySelector('.runtime-mobile-topbar')) {
      const bar = document.createElement('header')
      bar.className = 'runtime-mobile-topbar'
      bar.innerHTML = '<div><img src="/icon.svg" alt=""><span><strong>Smart Finance</strong><small>Controle financeiro</small></span></div>'
      bar.appendChild(themeButton())
      main.before(bar)
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
  }

  async function exportToPhone(button, status) {
    button.disabled = true
    const old = button.textContent
    button.textContent = 'Preparando pacote...'
    status.textContent = ''
    try {
      const token = localStorage.getItem('smart-finance-token')
      const ownerId = Number(localStorage.getItem('smart-finance-owner-id')) || 0
      const query = ownerId ? `?owner_id=${ownerId}` : ''
      const response = await fetch(`/api/transfer/export${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      if (!response.ok) {
        const raw = await response.text()
        let message = raw || `Erro HTTP ${response.status}`
        try { message = JSON.parse(raw)?.detail || message } catch { /* texto bruto */ }
        throw new Error(message)
      }
      const blob = await response.blob()
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      downloadBlob(blob, `smart-finance-para-celular-${stamp}.zip`)
      status.textContent = 'Pacote criado. Envie o ZIP ao celular e importe em Configurações.'
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Não foi possível criar o pacote.'
    } finally {
      button.disabled = false
      button.textContent = old
    }
  }

  function enhanceSettings() {
    const grid = document.querySelector('.settings-grid')
    if (!grid) return

    const panels = [...grid.querySelectorAll(':scope > .panel')]
    const byTitle = (text) => panels.find((panel) => panel.querySelector('h3')?.textContent?.trim().toLowerCase() === text.toLowerCase())
    const backup = byTitle('Backup e banco de dados')
    if (backup) {
      backup.querySelectorAll('button, label').forEach((control) => {
        if (control.textContent?.toLowerCase().includes('fazer backup agora')) control.remove()
      })
      const description = backup.querySelector('p')
      const desiredDescription = 'O backup diário interno continua automático. Use apenas Exportar banco e Importar banco para movimentar o SQLite completo.'
      if (description && description.textContent !== desiredDescription) description.textContent = desiredDescription
    }

    if (!grid.querySelector('[data-runtime-transfer-card]')) {
      const profile = byTitle('Perfil')
      const card = document.createElement('article')
      card.className = 'panel transfer-panel runtime-transfer-card'
      card.dataset.runtimeTransferCard = 'true'
      card.innerHTML = `
        <div class="panel-title-row"><div><span class="panel-kicker">Computador → celular</span><h3>Transferir dados para o celular</h3></div><span class="panel-icon">📱</span></div>
        <p>Crie um ZIP com contas, cartões, categorias, rendas, despesas, empréstimos, parcelas e comprovantes do usuário selecionado.</p>
        <ol class="runtime-transfer-steps"><li>Exporte o pacote neste computador.</li><li>Envie o ZIP para o celular.</li><li>No APK, abra Configurações e importe os dados do computador.</li></ol>
        <div class="runtime-transfer-actions"><button type="button" class="primary-button">Exportar dados para o celular</button></div>
        <div class="runtime-transfer-status" aria-live="polite"></div>`
      const button = card.querySelector('button')
      const status = card.querySelector('.runtime-transfer-status')
      button.addEventListener('click', () => exportToPhone(button, status))
      if (profile) profile.after(card)
      else grid.prepend(card)
    }
  }

  function run() {
    enhanceAuth()
    enhanceShell()
    enhanceSettings()
    applyTheme(document.documentElement.dataset.theme || currentTheme())
  }

  applyTheme(currentTheme())
  let runQueued = false
  const observer = new MutationObserver(() => {
    if (runQueued) return
    runQueued = true
    requestAnimationFrame(() => {
      runQueued = false
      run()
    })
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('hashchange', () => setTimeout(run, 0))
  window.addEventListener('DOMContentLoaded', run)
  run()
})()
