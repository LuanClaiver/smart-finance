import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { api, jsonBody } from '../services/api'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { User } from '../types'

export default function AdminPage({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const load = () => api<User[]>('/admin/users').then(setUsers).catch((err) => setError(err.message))
  useEffect(() => { void load() }, [])

  async function patch(user: User, changes: Record<string, unknown>, successMessage = 'Usuário atualizado') {
    try { await api(`/admin/users/${user.id}`, { method: 'PATCH', ...jsonBody(changes) }); await load(); toast.success(successMessage, user.display_name) } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao atualizar'; setError(message); toast.error('Não foi possível atualizar o usuário', message) }
  }
  async function editUser(user: User) {
    const display_name = prompt('Nome exibido:', user.display_name)
    if (display_name === null) return
    const username = prompt('Nome de usuário:', user.username)
    if (username === null) return
    const email = prompt('E-mail:', user.email)
    if (email === null) return
    await patch(user, { display_name, username, email }, 'Dados do usuário atualizados')
  }
  async function resetPassword(user: User) {
    const password = prompt(`Nova senha temporária para ${user.display_name}:`)
    if (password) await patch(user, { password }, 'Senha redefinida')
  }
  async function remove(user: User) {
    const confirmed = await confirmAction({
      title: `Excluir ${user.display_name}?`,
      message: 'A conta e todos os dados financeiros deste usuário serão excluídos.',
      detail: 'Esta ação não pode ser desfeita. Faça um backup antes de continuar.',
      confirmLabel: 'Excluir usuário',
      tone: 'danger',
    })
    if (!confirmed) return
    try { await api(`/admin/users/${user.id}`, { method: 'DELETE' }); await load(); toast.success('Usuário excluído', user.display_name) } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao excluir'; setError(message); toast.error('Não foi possível excluir o usuário', message) }
  }

  return <>
    <PageHeader title="Gerenciar usuários" subtitle="Administração local de contas e permissões" />
    {error && <div className="form-error">{error}</div>}
    <section className="table-panel"><table><thead><tr><th>Usuário</th><th>E-mail</th><th>Permissão</th><th>Status</th><th>Ações</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.display_name}</strong><small className="block">@{user.username}</small></td><td>{user.email}</td><td><select value={user.role} disabled={user.id === currentUser.id} onChange={(e) => patch(user, { role: e.target.value })}><option value="user">Usuário</option><option value="admin">Administrador</option></select></td><td><label className="switch-label"><input type="checkbox" checked={user.is_active} disabled={user.id === currentUser.id} onChange={(e) => patch(user, { is_active: e.target.checked })} /> {user.is_active ? 'Ativo' : 'Inativo'}</label></td><td className="row-actions"><button onClick={() => editUser(user)}>Editar</button><button onClick={() => resetPassword(user)}>Redefinir senha</button>{user.id !== currentUser.id && <button className="danger-text" onClick={() => remove(user)}>Excluir</button>}</td></tr>)}</tbody></table></section>
  </>
}
