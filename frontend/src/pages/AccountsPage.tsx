import { FormEvent, useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ModalCard from '../components/ModalCard'
import PageHeader from '../components/PageHeader'
import { api, jsonBody, money } from '../services/api'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { Account } from '../types'

const accountTypeLabels: Record<string, string> = {
  digital: 'Conta digital',
  checking: 'Conta corrente',
  savings: 'Poupança',
  wallet: 'Carteira',
  cash: 'Dinheiro',
}

export default function AccountsPage() {
  const [items, setItems] = useState<Account[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [error, setError] = useState('')

  const load = () => api<Account[]>('/accounts')
    .then((data) => { setItems(data); setError('') })
    .catch((err) => setError(err.message))

  useEffect(() => { void load() }, [])

  function openNew() {
    setEditing(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(item: Account) {
    setEditing(item)
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
      name: String(form.get('name') || '').trim(),
      account_type: String(form.get('account_type') || 'digital'),
      initial_balance: Number(form.get('initial_balance') || 0),
      is_active: true,
    }

    try {
      if (editing) {
        await api(`/accounts/${editing.id}`, { method: 'PATCH', ...jsonBody(payload) })
      } else {
        await api('/accounts', { method: 'POST', ...jsonBody(payload) })
      }
      const wasEditing = Boolean(editing)
      closeForm()
      await load()
      toast.success(wasEditing ? 'Conta atualizada' : 'Conta salva', `${payload.name} foi ${wasEditing ? 'atualizada' : 'adicionada'}.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar'
      setError(message)
      toast.error(editing ? 'Não foi possível atualizar a conta' : 'Não foi possível salvar a conta', message)
    }
  }

  async function remove(id: number) {
    const account = items.find((item) => item.id === id)
    const confirmed = await confirmAction({
      title: `Excluir ${account?.name || 'esta conta'}?`,
      message: 'Esta conta será removida do Smart Finance.',
      detail: 'Lançamentos vinculados não serão apagados, mas ficarão sem a conta selecionada.',
      confirmLabel: 'Excluir conta',
      tone: 'danger',
    })
    if (!confirmed) return
    try {
      await api(`/accounts/${id}`, { method: 'DELETE' })
      await load()
      toast.success('Conta excluída', 'A conta foi removida.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir'
      setError(message)
      toast.error('Não foi possível excluir a conta', message)
    }
  }

  return <>
    <PageHeader title="Contas e carteiras" subtitle="Organize bancos, carteira e dinheiro" actions={<button className="primary-button compact" onClick={openNew}>+ Nova conta</button>} />

    {showForm && <ModalCard onClose={closeForm} label={editing ? `Editar conta ${editing.name}` : 'Nova conta'}>
      <form className="panel form-grid modal-form" onSubmit={submit}>
        <h3 className="form-title wide">{editing ? `Editar conta: ${editing.name}` : 'Nova conta'}</h3>
        <label>Nome<input name="name" placeholder="Ex.: Inter" required defaultValue={editing?.name || ''} /></label>
        <label>Tipo<select name="account_type" defaultValue={editing?.account_type || 'digital'}><option value="digital">Conta digital</option><option value="checking">Conta corrente</option><option value="savings">Poupança</option><option value="wallet">Carteira</option><option value="cash">Dinheiro</option></select></label>
        <label>Saldo inicial<input name="initial_balance" type="number" step="0.01" defaultValue={editing ? Number(editing.initial_balance) : 0} /></label>
        <div className="form-actions"><button className="primary-button">{editing ? 'Salvar alterações' : 'Salvar'}</button><button type="button" className="secondary-button" onClick={closeForm}>Cancelar</button></div>
      </form>
    </ModalCard>}

    {error && <div className="form-error">{error}</div>}

    <section className="cards-list">{items.length === 0 ? <EmptyState text="Nenhuma conta cadastrada." /> : items.map((item) => <article className="list-card account-list-card" key={item.id}>
      <div><strong>{item.name}</strong><span>{accountTypeLabels[item.account_type] || item.account_type}</span></div>
      <div className="list-card-value"><strong>{money(Number(item.initial_balance))}</strong><small>Saldo inicial</small></div>
      <div className="account-card-actions"><button className="secondary-button compact" onClick={() => openEdit(item)}>Editar</button><button className="danger-button" onClick={() => remove(item.id)}>Excluir</button></div>
    </article>)}</section>
  </>
}
