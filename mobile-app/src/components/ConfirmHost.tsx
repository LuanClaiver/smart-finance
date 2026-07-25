import { useEffect, useRef, useState } from 'react'
import { subscribeToConfirmations, type ConfirmRequest } from '../services/confirm'

export default function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const confirmButton = useRef<HTMLButtonElement>(null)

  useEffect(() => subscribeToConfirmations((next) => {
    setRequest((current) => {
      if (current) current.resolve(false)
      return next
    })
  }), [])

  useEffect(() => {
    if (!request) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => confirmButton.current?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [request])

  function finish(value: boolean) {
    setRequest((current) => {
      current?.resolve(value)
      return null
    })
  }

  if (!request) return null

  return <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) finish(false)
  }}>
    <section className={`confirm-card ${request.tone}`} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      <div className="confirm-symbol" aria-hidden="true">{request.tone === 'danger' ? '!' : request.tone === 'warning' ? '⚠' : '?'}</div>
      <div className="confirm-copy">
        <span className="confirm-eyebrow">Confirmação necessária</span>
        <h2 id="confirm-title">{request.title}</h2>
        <p id="confirm-message">{request.message}</p>
        {request.detail && <small>{request.detail}</small>}
      </div>
      <div className="confirm-actions">
        <button type="button" className="secondary-button" onClick={() => finish(false)}>{request.cancelLabel}</button>
        <button ref={confirmButton} type="button" className={request.tone === 'danger' ? 'danger-button' : 'primary-button'} onClick={() => finish(true)}>{request.confirmLabel}</button>
      </div>
    </section>
  </div>
}
