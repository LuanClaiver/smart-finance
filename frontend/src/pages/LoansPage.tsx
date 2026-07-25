import { FormEvent, useEffect, useRef, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ModalCard from '../components/ModalCard'
import PageHeader from '../components/PageHeader'
import { api, jsonBody, money, today } from '../services/api'
import { readNavigationTarget, scrollToTarget } from '../services/navigation'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { Account, Loan, LoanInstallment } from '../types'

export default function LoansPage() {
  const route = readNavigationTarget('loans')
  const targetId = route.itemId
  const [items, setItems] = useState<Loan[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [editingInstallment, setEditingInstallment] = useState<LoanInstallment | null>(null)
  const installmentFormRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')

  const load = () => Promise.all([api<Loan[]>('/loans'), api<Account[]>('/accounts')])
    .then(([loans, accountItems]) => { setItems(loans); setAccounts(accountItems) })
    .catch((err) => setError(err.message))

  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!editingInstallment) return
    const onPointerDown = (event: MouseEvent) => {
      if (!installmentFormRef.current?.contains(event.target as Node)) setEditingInstallment(null)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setEditingInstallment(null) }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [editingInstallment])

  useEffect(() => {
    if (targetId && items.some((loan) => loan.installments.some((item) => item.id === targetId))) {
      scrollToTarget(`[data-installment-id="${targetId}"]`)
    }
  }, [items, targetId])

  function openNew() {
    setEditingLoan(null)
    setEditingInstallment(null)
    setError('')
    setShowForm(true)
  }

  function openEditLoan(loan: Loan) {
    setEditingLoan(loan)
    setEditingInstallment(null)
    setError('')
    setShowForm(true)
    window.requestAnimationFrame(() => document.getElementById('loan-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function closeLoanForm() {
    setShowForm(false)
    setEditingLoan(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      creditor: form.get('creditor'),
      principal_amount: Number(form.get('principal_amount')),
      total_amount: Number(form.get('total_amount')),
      interest_rate: Number(form.get('interest_rate') || 0),
      installment_count: Number(form.get('installment_count')),
      installment_amount: Number(form.get('installment_amount')),
      first_due_date: form.get('first_due_date'),
      notes: form.get('notes') || '',
    }
    try {
      setError('')
      if (editingLoan) {
        await api(`/loans/${editingLoan.id}`, { method: 'PATCH', ...jsonBody(payload) })
      } else {
        await api('/loans', { method: 'POST', ...jsonBody(payload) })
      }
      const wasEditing = Boolean(editingLoan)
      closeLoanForm()
      await load()
      toast.success(wasEditing ? 'Empréstimo atualizado' : 'Empréstimo salvo', `${String(payload.creditor)} foi ${wasEditing ? 'atualizado' : 'adicionado'}.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar empréstimo'
      setError(message)
      toast.error('Não foi possível salvar o empréstimo', message)
    }
  }

  async function saveInstallment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingInstallment) return
    const form = new FormData(event.currentTarget)
    const status = String(form.get('status'))
    try {
      setError('')
      await api(`/loan-installments/${editingInstallment.id}`, { method: 'PATCH', ...jsonBody({
        due_date: form.get('due_date'),
        amount: Number(form.get('amount')),
        status,
        paid_date: status === 'paid' ? form.get('paid_date') || today() : null,
        account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
      }) })
      const number = editingInstallment.installment_number
      setEditingInstallment(null)
      await load()
      toast.success('Parcela atualizada', `A parcela ${number} foi atualizada.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao editar parcela'
      setError(message)
      toast.error('Não foi possível editar a parcela', message)
    }
  }

  async function pay(id: number, accountId: string) {
    try {
      setError('')
      await api(`/loan-installments/${id}/pay${accountId ? `?account_id=${accountId}` : ''}`, { method: 'POST' })
      await load()
      toast.success('Parcela paga', 'O pagamento foi registrado com sucesso.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar pagamento'
      setError(message)
      toast.error('Pagamento não registrado', message)
    }
  }

  async function remove(id: number) {
    const loan = items.find((item) => item.id === id)
    const confirmed = await confirmAction({
      title: `Excluir ${loan?.creditor || 'este empréstimo'}?`,
      message: 'O empréstimo completo e todas as parcelas serão removidos.',
      detail: 'Parcelas já pagas também serão excluídas do histórico. Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir empréstimo',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      setError('')
      await api(`/loans/${id}`, { method: 'DELETE' })
      await load()
      toast.success('Empréstimo excluído', 'O empréstimo e suas parcelas foram removidos.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir'
      setError(message)
      toast.error('Não foi possível excluir o empréstimo', message)
    }
  }

  return <>
    <PageHeader
      title="Empréstimos e dívidas"
      subtitle="Acompanhe parcelas, juros e saldo pendente"
      actions={<button className="primary-button compact" onClick={openNew}>+ Novo empréstimo</button>}
    />

    {showForm && <ModalCard onClose={closeLoanForm} label={editingLoan ? `Editar empréstimo ${editingLoan.creditor}` : 'Novo empréstimo'} wide><form id="loan-form" key={editingLoan?.id || 'new-loan'} className="panel form-grid modal-form" onSubmit={submit}>
      <h3 className="form-title wide">{editingLoan ? `Editar empréstimo: ${editingLoan.creditor}` : 'Novo empréstimo'}</h3>
      <label>Instituição ou credor<input name="creditor" required defaultValue={editingLoan?.creditor || ''} /></label>
      <label>Valor recebido<input name="principal_amount" type="number" step="0.01" min="0" required defaultValue={editingLoan ? Number(editingLoan.principal_amount) : ''} /></label>
      <label>Valor total<input name="total_amount" type="number" step="0.01" min="0" required defaultValue={editingLoan ? Number(editingLoan.total_amount) : ''} /></label>
      <label>Juros (%)<input name="interest_rate" type="number" step="0.001" defaultValue={editingLoan ? Number(editingLoan.interest_rate) : 0} /></label>
      <label>Quantidade de parcelas<input name="installment_count" type="number" min="1" max="600" required defaultValue={editingLoan?.installment_count || ''} /></label>
      <label>Valor da parcela<input name="installment_amount" type="number" step="0.01" min="0" required defaultValue={editingLoan ? Number(editingLoan.installment_amount) : ''} /></label>
      <label>Primeiro vencimento<input name="first_due_date" type="date" defaultValue={editingLoan?.first_due_date || today()} required /></label>
      <label className="wide">Observações<textarea name="notes" rows={2} defaultValue={editingLoan?.notes || ''} /></label>
      {editingLoan && <p className="form-help wide">Parcelas já pagas serão preservadas. Valor e vencimento serão recalculados apenas nas parcelas pendentes.</p>}
      <div className="form-actions"><button className="primary-button">{editingLoan ? 'Salvar alterações' : 'Salvar'}</button><button type="button" className="secondary-button" onClick={closeLoanForm}>Cancelar</button></div>
    </form></ModalCard>}

    {error && <div className="form-error">{error}</div>}

    <section className="loan-list">
      {items.length === 0 ? <EmptyState text="Nenhum empréstimo cadastrado." /> : items.map((loan) => {
        const paid = loan.installments.filter((item) => item.status === 'paid').length
        const remaining = loan.installments.filter((item) => item.status !== 'paid').reduce((sum, item) => sum + Number(item.amount), 0)
        return <article className="panel loan-card" key={loan.id}>
          <div className="loan-header">
            <div><h3>{loan.creditor}</h3><p>{paid}/{loan.installment_count} parcelas pagas</p></div>
            <div><strong>{money(remaining)}</strong><small>Saldo estimado</small></div>
            <div className="loan-header-actions">
              <button className="secondary-button compact" onClick={() => openEditLoan(loan)}>Editar</button>
              <button className="danger-button" onClick={() => remove(loan.id)}>Excluir</button>
            </div>
          </div>
          <div className="progress"><span style={{ width: `${Math.round((paid / loan.installment_count) * 100)}%` }} /></div>
          <div className="installments">{loan.installments.map((item) => editingInstallment?.id === item.id ? <div key={item.id} data-installment-id={item.id} className="installment-editing target-row"><form ref={installmentFormRef} onSubmit={saveInstallment} className="installment-edit-form">
            <label>Vencimento<input name="due_date" type="date" required defaultValue={item.due_date} /></label>
            <label>Valor<input name="amount" type="number" step="0.01" min="0" required defaultValue={Number(item.amount)} /></label>
            <label>Situação<select name="status" defaultValue={item.status}><option value="pending">Pendente</option><option value="paid">Paga</option></select></label>
            <label>Data do pagamento<input name="paid_date" type="date" defaultValue={item.paid_date || ''} /></label>
            <label>Conta<select name="account_id" defaultValue={item.account_id || ''}><option value="">Não informada</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
            <div className="installment-edit-actions"><button className="primary-button compact">Salvar</button><button type="button" className="secondary-button compact" onClick={() => setEditingInstallment(null)}>Cancelar</button></div>
          </form></div> : <div key={item.id} data-installment-id={item.id} tabIndex={-1} className={`${item.status === 'paid' ? 'paid-installment' : ''} ${targetId === item.id ? 'target-row' : ''}`}>
            <span>{item.installment_number}/{loan.installment_count} • {item.due_date}</span>
            <b>{money(Number(item.amount))}</b>
            {item.status === 'paid' ? <small>Pago {item.paid_date ? `em ${item.paid_date}` : ''}</small> : <>
              <select id={`account-${item.id}`} defaultValue=""><option value="">Conta...</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
              <button onClick={() => pay(item.id, (document.getElementById(`account-${item.id}`) as HTMLSelectElement)?.value || '')}>Pagar</button>
            </>}
            <button className="edit-installment-button" onClick={() => setEditingInstallment(item)}>Editar</button>
          </div>)}</div>
        </article>
      })}
    </section>
  </>
}
