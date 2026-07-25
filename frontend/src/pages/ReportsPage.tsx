import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { api, currentMonth } from '../services/api'
import { toast } from '../services/toast'

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setLoading(true); setError('')
    try {
      const blob = await api<Blob>(`/reports/monthly.pdf?month=${month}`)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `smart-finance-${month}.pdf`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Relatório gerado', `PDF de ${month} baixado com sucesso.`)
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
      <button className="primary-button" onClick={download} disabled={loading}>{loading ? 'Gerando...' : 'Gerar e baixar PDF'}</button>
    </section>
  </>
}
