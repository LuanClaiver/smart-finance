(function () {
  'use strict'

  const PANEL_ID = 'smart-finance-transfer-runtime-panel'

  function selectedOwnerQuery() {
    const ownerId = Number(localStorage.getItem('smart-finance-owner-id')) || 0
    return ownerId ? `?owner_id=${ownerId}` : ''
  }

  async function exportTransfer(button, status) {
    const original = button.textContent
    button.disabled = true
    button.textContent = 'Preparando arquivo...'
    status.textContent = ''

    try {
      const token = localStorage.getItem('smart-finance-token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await fetch(`/api/transfer/export${selectedOwnerQuery()}`, {
        method: 'GET',
        headers,
        cache: 'no-store',
      })

      if (!response.ok) {
        let message = 'Não foi possível exportar os dados.'
        try {
          const body = await response.json()
          message = body.detail || body.message || message
        } catch (_) {
          // Resposta sem JSON.
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `smart-finance-transferencia-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(function () { URL.revokeObjectURL(url) }, 1000)
      status.textContent = 'Pacote criado. Agora importe este ZIP no APK.'
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Erro ao exportar os dados.'
      status.classList.add('form-error')
    } finally {
      button.disabled = false
      button.textContent = original
    }
  }

  function installTransferPanel() {
    const settingsGrid = document.querySelector('.settings-grid')
    if (!settingsGrid || document.getElementById(PANEL_ID)) return

    const alreadyRendered = Array.from(settingsGrid.querySelectorAll('button')).some(function (button) {
      return (button.textContent || '').includes('Exportar dados para o celular')
    })
    if (alreadyRendered) return

    const panel = document.createElement('article')
    panel.id = PANEL_ID
    panel.className = 'panel transfer-panel'

    const title = document.createElement('h3')
    title.textContent = 'Transferir dados para o celular'

    const description = document.createElement('p')
    description.textContent = 'Cria um ZIP com contas, cartões, categorias, rendas, despesas, empréstimos, parcelas e comprovantes do usuário selecionado.'

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'primary-button'
    button.textContent = 'Exportar dados para o celular'

    const status = document.createElement('small')
    status.className = 'muted-text'
    status.textContent = 'Depois, no APK, abra Configurações e importe o arquivo salvo em Downloads.'

    button.addEventListener('click', function () {
      status.className = 'muted-text'
      void exportTransfer(button, status)
    })

    panel.append(title, description, button, status)

    const categoryPanel = settingsGrid.querySelector('.category-panel')
    if (categoryPanel) settingsGrid.insertBefore(panel, categoryPanel)
    else settingsGrid.appendChild(panel)
  }

  function closeLightbox(overlay) {
    if (overlay.__escapeHandler) document.removeEventListener('keydown', overlay.__escapeHandler)
    overlay.remove()
    document.body.style.overflow = overlay.dataset.previousOverflow || ''
  }

  function openLightbox(image) {
    if (document.querySelector('.attachment-lightbox')) return

    const overlay = document.createElement('div')
    overlay.className = 'attachment-lightbox'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', 'Comprovante em tela cheia')
    overlay.dataset.previousOverflow = document.body.style.overflow

    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'attachment-lightbox-close'
    close.setAttribute('aria-label', 'Fechar comprovante')
    close.textContent = '×'

    const fullImage = document.createElement('img')
    fullImage.className = 'attachment-lightbox-image'
    fullImage.src = image.src
    fullImage.alt = image.alt || 'Comprovante'

    close.addEventListener('click', function () { closeLightbox(overlay) })
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeLightbox(overlay)
    })
    fullImage.addEventListener('click', function (event) { event.stopPropagation() })

    const escape = function (event) {
      if (event.key !== 'Escape') return
      document.removeEventListener('keydown', escape)
      closeLightbox(overlay)
    }
    overlay.__escapeHandler = escape
    document.addEventListener('keydown', escape)

    overlay.append(close, fullImage)
    document.body.style.overflow = 'hidden'
    document.body.appendChild(overlay)
  }

  document.addEventListener('click', function (event) {
    const target = event.target
    if (!(target instanceof Element)) return
    const image = target.closest('img.expense-attachment-image')
    if (!(image instanceof HTMLImageElement)) return
    if (image.closest('.expense-attachment-image-button')) return
    event.preventDefault()
    openLightbox(image)
  }, true)

  const observer = new MutationObserver(installTransferPanel)
  observer.observe(document.documentElement, { childList: true, subtree: true })
  installTransferPanel()
})()
