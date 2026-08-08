import { FormEvent, useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ModalCard from '../components/ModalCard'
import PageHeader from '../components/PageHeader'
import { api, currentMonth, jsonBody, money } from '../services/api'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { Account, Card, Expense } from '../types'

type Invoice = {
  card: Card
  month: string
  requested_month: string
  total: number
  status: string
  items: Expense[]
  available_months: string[]
}

function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

function dateLabel(value: string): string {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

export default function CardsPage() {
  const [items, setItems] = useState<Card[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Card | null>(null)
  const [error, setError] = useState('')

  const load = () => Promise.all([api<Card[]>('/cards'), api<Account[]>('/accounts')])
    .then(([cards, accountItems]) => { setItems(cards); setAccounts(accountItems); setError('') })
    .catch((err) => setError(err.message))

  useEffect(() => { void load() }, [])

  function openNew() {
    setEditing(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(card: Card) {
    setEditing(card)
    setError('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      name: form.get('name'),
      bank: form.get('bank') || '',
      brand: form.get('brand') || '',
      credit_limit: Number(form.get('credit_limit') || 0),
      closing_day: Number(form.get('closing_day')),
      due_day: Number(form.get('due_day')),
      payment_account_id: form.get('payment_account_id') ? Number(form.get('payment_account_id')) : null,
      color: form.get('color') || '#22c55e',
      is_active: true,
    }
    try {
      if (editing) {
        await api(`/cards/${editing.id}`, { method: 'PATCH', ...jsonBody(payload) })
      } else {
        await api('/cards', { method: 'POST', ...jsonBody(payload) })
      }
      const wasEditing = Boolean(editing)
      closeForm()
      setInvoice(null)
      await load()
      toast.success(wasEditing ? 'Cartão atualizado' : 'Cartão salvo', `${String(payload.name)} foi ${wasEditing ? 'atualizado' : 'adicionado'}.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar'
      setError(message)
      toast.error('Não foi possível salvar o cartão', message)
    }
  }

  async function fetchInvoice(id: number, selectedMonth: string): Promise<Invoice> {
    return api<Invoice>(`/cards/${id}/invoice?month=${encodeURIComponent(selectedMonth)}`)
  }

  async function viewInvoice(id: number, selectedMonth = month) {
    try {
      setError('')
      const data = await fetchInvoice(id, selectedMonth)
      setInvoice(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao abrir fatura'
      setError(message)
      toast.error('Não foi possível abrir a fatura', message)
    }
  }

  async function payInvoice() {
    if (!invoice) return
    try {
      await api(`/cards/${invoice.card.id}/invoice/pay?month=${invoice.month}${invoice.card.payment_account_id ? `&account_id=${invoice.card.payment_account_id}` : ''}`, { method: 'POST' })
      await viewInvoice(invoice.card.id, invoice.month)
      toast.success('Fatura paga', `${invoice.card.name} • ${monthLabel(invoice.month)}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao pagar fatura'
      setError(message)
      toast.error('Pagamento da fatura não concluído', message)
    }
  }

  async function remove(id: number) {
    const card = items.find((item) => item.id === id)
    const confirmed = await confirmAction({
      title: `Excluir ${card?.name || 'este cartão'}?`,
      message: 'O cartão será removido do cadastro.',
      detail: 'Compras já registradas continuarão no histórico, mas deixarão de estar vinculadas ao cartão.',
      confirmLabel: 'Excluir cartão',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      await api(`/cards/${id}`, { method: 'DELETE' })
      setInvoice(null)
      await load()
      toast.success('Cartão excluído', 'O cartão foi removido.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir'
      setError(message)
      toast.error('Não foi possível excluir o cartão', message)
    }
  }

  function changeMonth(value: string) {
    setMonth(value)
    if (invoice) void viewInvoice(invoice.card.id, value)
  }

  return <>
    <PageHeader title="Cartões" subtitle="Faturas agrupadas pelo mês de vencimento" actions={<>
      <input className="month-input" type="month" value={month} onChange={(event) => changeMonth(event.target.value)} />
      <button className="primary-button compact" onClick={openNew}>+ Novo cartão</button>
    </>} />

    {showForm && <ModalCard onClose={closeForm} label={editing ? `Editar cartão ${editing.name}` : 'Novo cartão'} wide>
      <form className="panel form-grid modal-form" onSubmit={submit}>
        <h3 className="form-title wide">{editing ? `Editar cartão: ${editing.name}` : 'Novo cartão'}</h3>
        <label>Nome<input name="name" placeholder="Ex.: Inter" required defaultValue={editing?.name || ''} /></label>
        <label>Banco<input name="bank" defaultValue={editing?.bank || ''} /></label>
        <label>Bandeira<input name="brand" placeholder="Visa, Mastercard..." defaultValue={editing?.brand || ''} /></label>
        <label>Limite<input name="credit_limit" type="number" step="0.01" min="0" defaultValue={editing ? Number(editing.credit_limit) : 0} /></label>
        <label>Dia do fechamento<input name="closing_day" type="number" min="1" max="31" defaultValue={editing?.closing_day || 28} /></label>
        <label>Dia do vencimento<input name="due_day" type="number" min="1" max="31" defaultValue={editing?.due_day || 7} /></label>
        <label>Conta de pagamento<select name="payment_account_id" defaultValue={editing?.payment_account_id || ''}><option value="">Não informada</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Cor<input name="color" type="color" defaultValue={editing?.color || '#22c55e'} /></label>
        <div className="form-actions"><button className="primary-button">{editing ? 'Salvar alterações' : 'Salvar'}</button><button type="button" className="secondary-button" onClick={closeForm}>Cancelar</button></div>
      </form>
    </ModalCard>}

    {error && <div className="form-error">{error}</div>}

    <section className="cards-grid">{items.length === 0 ? <EmptyState text="Nenhum cartão cadastrado." /> : items.map((item) => <article className="credit-card" key={item.id} style={{ '--card-color': item.color } as React.CSSProperties}>
      <div><small>{item.bank || 'Cartão'}</small><strong>{item.name}</strong></div><span>{item.brand || 'Crédito'}</span>
      <div className="credit-meta"><small>Limite</small><b>{money(Number(item.credit_limit))}</b></div>
      <div className="credit-cycle"><span>Fecha dia {item.closing_day}</span><span>Vence dia {item.due_day}</span></div>
      <div className="card-actions"><button onClick={() => viewInvoice(item.id)}>Ver fatura</button><button onClick={() => openEdit(item)}>Editar</button><button onClick={() => remove(item.id)}>Excluir</button></div>
    </article>)}</section>

    {invoice && <ModalCard onClose={() => setInvoice(null)} label={`Fatura ${invoice.card.name}`} wide>
      <section className="panel invoice-panel modal-invoice">
        <div className="invoice-title"><div><h3>Fatura {invoice.card.name}</h3><p>Vencimento em {monthLabel(invoice.month)} • {invoice.items.length} lançamento(s)</p></div><div><strong>{money(invoice.total)}</strong><span className={`status ${invoice.status === 'paid' ? 'paid' : 'pending'}`}>{invoice.status === 'paid' ? 'Paga' : 'Aberta'}</span></div></div>
        <div className="invoice-cycle-note">Fecha dia {invoice.card.closing_day} • Vence dia {invoice.card.due_day}. Esta tela usa o mês do vencimento para ficar igual à aba Despesas.</div>
        <div className="invoice-items">{invoice.items.length === 0 ? <p className="empty">Nenhuma fatura ou compra deste cartão vence neste mês.</p> : invoice.items.map((item) => <div key={item.id}><span className="invoice-item-copy"><strong>{item.description}{item.installment_number ? ` • ${item.installment_number}/${item.total_installments}` : ''}</strong><small>Vence em {dateLabel(item.due_date)} • Compra em {dateLabel(item.purchase_date)}</small></span><b>{money(Number(item.amount))}</b></div>)}</div>
        <div className="invoice-actions"><button type="button" className="secondary-button" onClick={() => setInvoice(null)}>Fechar</button>{invoice.items.length > 0 && invoice.status !== 'paid' && <button className="primary-button compact" onClick={payInvoice}>Pagar fatura</button>}</div>
      </section>
    </ModalCard>}
  </>
}
