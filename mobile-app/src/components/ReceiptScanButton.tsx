import { ChangeEvent, useRef, useState } from 'react'
import { scanReceipt, type ReceiptDraft } from '../services/mobile/receiptScanner'
import { toast } from '../services/toast'
import { isNativeMobile } from '../services/api'

export default function ReceiptScanButton({
  kind,
  onScanned,
}: {
  kind: 'expense' | 'income'
  onScanned: (draft: ReceiptDraft, file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Preparando a câmera')

  if (!isNativeMobile()) return null

  async function readImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setScanning(true)
    setProgress(0)
    setStatus('Preparando a foto')
    try {
      const result = await scanReceipt(file, kind, (nextProgress, label) => {
        setProgress(nextProgress)
        setStatus(label)
      })
      onScanned(result.draft, result.attachmentFile)
      const amountMessage = result.draft.amount === null ? ' Revise e informe o valor.' : ''
      toast.success('Comprovante analisado', `Os campos foram preenchidos automaticamente.${amountMessage}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível analisar o comprovante.'
      toast.error('Leitura não concluída', message)
    } finally {
      setScanning(false)
      setProgress(0)
    }
  }

  return <>
    <button type="button" className="secondary-button compact receipt-scan-button" disabled={scanning} onClick={() => inputRef.current?.click()}>
      {scanning ? 'Lendo...' : '📷 Ler comprovante'}
    </button>
    <input ref={inputRef} className="receipt-scan-input" type="file" accept="image/*" capture="environment" onChange={readImage} />
    {scanning && <div className="receipt-scan-overlay" role="status" aria-live="polite">
      <div className="receipt-scan-progress-card">
        <div className="receipt-scan-icon">▤</div>
        <strong>{status}</strong>
        <p>Mantenha o aplicativo aberto. A primeira leitura pode precisar de internet para preparar o leitor.</p>
        <div className="receipt-scan-progress"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <small>{Math.round(progress * 100)}%</small>
      </div>
    </div>}
  </>
}
