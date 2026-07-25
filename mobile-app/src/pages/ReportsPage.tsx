import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { api, currentMonth, isNativeMobile } from '../services/api'
import { toast } from '../services/toast'

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('Não foi possível preparar o PDF.'))
    reader.readAsDataURL(blob)
  })
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setLoading(true); setError('')
    try {
      const blob = await api<Blob>(`/reports/monthly.pdf?month=${month}`)
      const filename = `smart-finance-${month}.pdf`
      if (isNativeMobile()) {
        const { Directory, Filesystem } = await import('@capacitor/filesystem')
        const { Share } = await import('@capacitor/share')
        const saved = await Filesystem.writeFile({ path: `SmartFinance/relatorios/${filename}`, data: await blobToBase64(blob), directory: Directory.Documents, recursive: true })
        try { await Share.share({ title: 'Relatório Smart Finance', text: `Relatório de ${month}`, url: saved.uri, dialogTitle: 'Salvar ou compartilhar PDF' }) } catch { /* o arquivo já foi salvo */ }
        toast.success('Relatório gerado', `Salvo em Documentos/SmartFinance/relatorios/${filename}.`)
      } else {
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = filename
        anchor.click()
        URL.revokeObjectURL(url)
        toast.success('Relatório gerado', `PDF de ${month} baixado com sucesso.`)
      }
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao gerar relatório'; setError(message); toast.error('Não foi possível gerar o relatório', message) }
    finally { setLoading(false) }
  }

  return <>
    <PageHeader title="Relatório mensal" subtitle="Gere um PDF resumido e organizado" />
    <section className="panel report-card">
      <div className="report-icon">▧</div>
      <h2>Resumo financeiro em PDF</h2>
      <p>O arquivo inclui rendas, despesas, saldo, gastos fixos e variáveis, cartões e resumo por categoria.</p>
      <label>Mês de referência<input className="month-input large" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
      {error && <div className="form-error">{error}</div>}
      <button className="primary-button" onClick={download} disabled={loading}>{loading ? 'Gerando...' : 'Gerar e compartilhar PDF'}</button>
    </section>
  </>
}
