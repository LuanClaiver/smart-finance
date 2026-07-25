import { useEffect, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  onClose: () => void
  label: string
  wide?: boolean
}

export default function ModalCard({ children, onClose, label, wide = false }: Props) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('.confirm-backdrop')) {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <div className={`modal-shell ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
      {children}
    </div>
  </div>
}
