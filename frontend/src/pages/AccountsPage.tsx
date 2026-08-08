import { FormEvent, useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import ModalCard from '../components/ModalCard'
import PageHeader from '../components/PageHeader'
import MoneyInput from '../components/MoneyInput'
import { api, currentMonth, jsonBody, money, today } from '../services/api'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { Account, AccountSummary, InternalTransfer } from '../types'

const accountTypeLabels: Record<string, string> = { digital: 'Conta digital', checking: 'Conta corrente', savings: 'Poupança', wallet: 'Carteira', cash: 'Dinheiro' }

export default function AccountsPage() {
  const [items, setItems] = useState<AccountSummary[]>([])
  const [transfers, setTransfers] = useState<InternalTransfer[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [showForm, setShowForm] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [reconciling, setReconciling] = useState<AccountSummary | null>(null)
  const [editing, setEditing] = useState<Account | null>(null)
  const [error, setError] = useState('')

  const load = () => Promise.all([api<AccountSummary[]>('/accounts/summary'), api<InternalTransfer[]>(`/transfers?month=${month}`)])
    .then(([accounts, transferRows]) => { setItems(accounts); setTransfers(transferRows); setError('') })
    .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar contas'))
  useEffect(() => { void load() }, [month])

  function openNew() { setEditing(null); setError(''); setShowForm(true) }
  function openEdit(item: Account) { setEditing(item); setError(''); setShowForm(true) }
  function closeForm() { setShowForm(false); setEditing(null) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const payload = { name: String(form.get('name') || '').trim(), account_type: String(form.get('account_type') || 'digital'), initial_balance: Number(form.get('initial_balance') || 0), reported_balance: editing?.reported_balance ?? null, is_active: true }
    try { if (editing) await api(`/accounts/${editing.id}`, { method: 'PATCH', ...jsonBody(payload) }); else await api('/accounts', { method: 'POST', ...jsonBody(payload) }); const wasEditing=Boolean(editing); closeForm(); await load(); toast.success(wasEditing ? 'Conta atualizada' : 'Conta salva', payload.name) }
    catch (err) { const message=err instanceof Error?err.message:'Erro ao salvar'; setError(message); toast.error('Não foi possível salvar a conta', message) }
  }

  async function reconcile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!reconciling) return; const form=new FormData(event.currentTarget)
    try { await api(`/accounts/${reconciling.id}/reconcile`, { method:'POST', ...jsonBody({ reported_balance:Number(form.get('reported_balance')||0) }) }); setReconciling(null); await load(); toast.success('Saldo conferido', 'O Smart Finance comparou o saldo do banco com o saldo calculado.') }
    catch(err){const message=err instanceof Error?err.message:'Erro ao conciliar'; setError(message); toast.error('Não foi possível conciliar',message)}
  }

  async function createTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget)
    try { await api('/transfers',{method:'POST',...jsonBody({from_account_id:Number(form.get('from_account_id')),to_account_id:Number(form.get('to_account_id')),amount:Number(form.get('amount')),transfer_date:form.get('transfer_date'),notes:form.get('notes')||''})}); setShowTransfer(false); await load(); toast.success('Transferência registrada','A movimentação entre contas não entra como renda nem despesa.') }
    catch(err){const message=err instanceof Error?err.message:'Erro ao transferir'; setError(message); toast.error('Não foi possível registrar a transferência',message)}
  }

  async function removeTransfer(id:number){const ok=await confirmAction({title:'Excluir transferência?',message:'A movimentação entre contas será removida.',confirmLabel:'Excluir',tone:'danger'});if(!ok)return;await api(`/transfers/${id}`,{method:'DELETE'});await load();toast.success('Transferência excluída','Os saldos calculados foram atualizados.')}

  async function remove(id: number) { const account=items.find((item)=>item.id===id); const confirmed=await confirmAction({title:`Excluir ${account?.name||'esta conta'}?`,message:'Esta conta será removida do Smart Finance.',detail:'Lançamentos vinculados não serão apagados, mas ficarão sem a conta selecionada.',confirmLabel:'Excluir conta',tone:'danger'}); if(!confirmed)return; try{await api(`/accounts/${id}`,{method:'DELETE'});await load();toast.success('Conta excluída','A conta foi removida.')}catch(err){const message=err instanceof Error?err.message:'Erro ao excluir';setError(message);toast.error('Não foi possível excluir a conta',message)} }

  return <>
    <PageHeader title="Contas e carteiras" subtitle="Saldo calculado, conciliação e transferências entre suas contas" actions={<><button className="secondary-button compact" onClick={()=>setShowTransfer(true)}>⇄ Transferir</button><button className="primary-button compact" onClick={openNew}>+ Nova conta</button></>} />
    {showForm && <ModalCard onClose={closeForm} label={editing?`Editar conta ${editing.name}`:'Nova conta'}><form className="panel form-grid modal-form" onSubmit={submit}><h3 className="form-title wide">{editing?`Editar conta: ${editing.name}`:'Nova conta'}</h3><label>Nome<input name="name" required defaultValue={editing?.name||''}/></label><label>Tipo<select name="account_type" defaultValue={editing?.account_type||'digital'}><option value="digital">Conta digital</option><option value="checking">Conta corrente</option><option value="savings">Poupança</option><option value="wallet">Carteira</option><option value="cash">Dinheiro</option></select></label><label>Saldo inicial<MoneyInput name="initial_balance" allowNegative defaultValue={editing?Number(editing.initial_balance):0}/></label><div className="form-actions"><button className="primary-button">{editing?'Salvar alterações':'Salvar'}</button><button type="button" className="secondary-button" onClick={closeForm}>Cancelar</button></div></form></ModalCard>}
    {showTransfer && <ModalCard onClose={()=>setShowTransfer(false)} label="Transferir entre contas"><form className="panel form-grid modal-form" onSubmit={createTransfer}><h3 className="form-title wide">Transferência interna</h3><label>Origem<select name="from_account_id" required><option value="">Selecione</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Destino<select name="to_account_id" required><option value="">Selecione</option>{items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Valor<MoneyInput name="amount" required/></label><label>Data<input name="transfer_date" type="date" defaultValue={today()} required/></label><label className="wide">Observações<textarea name="notes" rows={2}/></label><div className="form-actions"><button className="primary-button">Registrar transferência</button><button type="button" className="secondary-button" onClick={()=>setShowTransfer(false)}>Cancelar</button></div></form></ModalCard>}
    {reconciling && <ModalCard onClose={()=>setReconciling(null)} label={`Conciliar ${reconciling.name}`}><form className="panel form-grid modal-form" onSubmit={reconcile}><h3 className="form-title wide">Conferir saldo</h3><div className="wide reconciliation-summary"><span>Calculado pelo Smart Finance <strong>{money(reconciling.calculated_balance)}</strong></span>{reconciling.reported_balance!=null&&<span>Último informado <strong>{money(Number(reconciling.reported_balance))}</strong></span>}</div><label className="wide">Saldo que aparece no banco agora<MoneyInput name="reported_balance" allowNegative required defaultValue={reconciling.reported_balance??reconciling.calculated_balance}/></label><div className="form-actions"><button className="primary-button">Comparar saldo</button><button type="button" className="secondary-button" onClick={()=>setReconciling(null)}>Cancelar</button></div></form></ModalCard>}
    {error&&<div className="form-error">{error}</div>}
    <section className="cards-list account-summary-list">{items.length===0?<EmptyState text="Nenhuma conta cadastrada."/>:items.map(item=><article className="list-card account-list-card" key={item.id}><div><strong>{item.name}</strong><span>{accountTypeLabels[item.account_type]||item.account_type}</span></div><div className="account-balance-stack"><small>Saldo calculado</small><strong>{money(Number(item.calculated_balance))}</strong>{item.reported_balance!=null&&<><small>Saldo informado: {money(Number(item.reported_balance))}</small><span className={Math.abs(Number(item.difference||0))<0.01?'reconcile-ok':'reconcile-warning'}>{Math.abs(Number(item.difference||0))<0.01?'✓ Conciliado':`Diferença: ${money(Number(item.difference||0))}`}</span></>}</div><div className="account-card-actions"><button className="secondary-button compact" onClick={()=>setReconciling(item)}>Conciliar</button><button className="secondary-button compact" onClick={()=>openEdit(item)}>Editar</button><button className="danger-button" onClick={()=>remove(item.id)}>Excluir</button></div></article>)}</section>
    <section className="panel transfers-history"><div className="panel-title-row"><div><h3>Transferências internas</h3><p>Não alteram seus totais de renda e despesa.</p></div><input type="month" className="month-input" value={month} onChange={e=>setMonth(e.target.value)}/></div>{transfers.length?<div className="simple-list">{transfers.map(t=><div className="simple-list-row" key={t.id}><div><strong>{items.find(x=>x.id===t.from_account_id)?.name||'Conta'} → {items.find(x=>x.id===t.to_account_id)?.name||'Conta'}</strong><small>{t.transfer_date}{t.notes?` • ${t.notes}`:''}</small></div><span>{money(Number(t.amount))}</span><button className="danger-text" onClick={()=>removeTransfer(t.id)}>Excluir</button></div>)}</div>:<EmptyState text="Nenhuma transferência neste mês."/>}</section>
  </>
}
