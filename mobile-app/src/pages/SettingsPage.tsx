import { FormEvent, useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { api, isNativeMobile, jsonBody, setToken } from '../services/api'
import { toast } from '../services/toast'
import type { Category, User } from '../types'

type Backup = { name: string; size: number; created_at: string }

export default function SettingsPage({ user, onUser }: { user: User; onUser: (user: User) => void }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [backups, setBackups] = useState<Backup[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const passwordFormRef = useRef<HTMLFormElement>(null)
  const recoveryFormRef = useRef<HTMLFormElement>(null)
  const categoryFormRef = useRef<HTMLFormElement>(null)
  const loadBackups = () => user.role === 'admin' ? api<Backup[]>('/backups').then(setBackups).catch(() => undefined) : Promise.resolve()
  const loadCategories = () => api<Category[]>('/categories').then(setCategories).catch(() => undefined)
  useEffect(() => { void loadBackups(); void loadCategories() }, [user.role])

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    if (form.get('new_password') !== form.get('confirm_password')) { const message = 'As novas senhas não conferem.'; setError(message); toast.warning('Verifique as senhas', message); return }
    try {
      const response = await api<{ message: string; token: string }>('/auth/change-password', { method: 'POST', ...jsonBody({ current_password: form.get('current_password'), new_password: form.get('new_password') }) })
      setToken(response.token); setMessage(response.message); passwordFormRef.current?.reset()
      const refreshed = await api<User>('/auth/me'); onUser(refreshed)
      toast.success('Senha alterada', response.message)
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao alterar senha'; setError(message); toast.error('Não foi possível alterar a senha', message) }
  }

  async function changeRecoveryKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      const response = await api<{ message: string }>('/auth/change-recovery-key', { method: 'POST', ...jsonBody({ current_password: form.get('current_password'), new_recovery_key: form.get('new_recovery_key') }) })
      setMessage(response.message); recoveryFormRef.current?.reset()
      toast.success('Chave de recuperação alterada', response.message)
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao alterar chave'; setError(message); toast.error('Não foi possível alterar a chave', message) }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    try {
      await api('/categories', { method: 'POST', ...jsonBody({ name: form.get('name'), kind: form.get('kind'), is_active: true }) })
      setMessage('Categoria criada.'); categoryFormRef.current?.reset(); await loadCategories()
      toast.success('Categoria criada', String(form.get('name')))
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao criar categoria'; setError(message); toast.error('Não foi possível criar a categoria', message) }
  }

  async function toggleCategory(item: Category) {
    try {
      await api(`/categories/${item.id}`, { method: 'PATCH', ...jsonBody({ name: item.name, kind: item.kind, is_active: !item.is_active }) })
      await loadCategories()
      toast.success(item.is_active ? 'Categoria ocultada' : 'Categoria ativada', item.name)
    } catch (err) { const message = err instanceof Error ? err.message : 'Erro ao atualizar categoria'; setError(message); toast.error('Não foi possível atualizar a categoria', message) }
  }

  async function createBackup() {
    try { const result = await api<{ message: string; name: string }>('/backups', { method: 'POST' }); setMessage(`${result.message}: ${result.name}`); await loadBackups(); toast.success('Backup criado', result.name) } catch (err) { const message = err instanceof Error ? err.message : 'Erro no backup'; setError(message); toast.error('Não foi possível criar o backup', message) }
  }

  return <>
    <PageHeader title="Configurações" subtitle="Segurança, categorias, backups e informações do sistema" />
    {user.must_change_password && <div className="warning-banner">A conta ainda usa uma senha temporária. Altere-a antes de continuar usando o sistema.</div>}
    <section className="settings-grid">
      <form ref={passwordFormRef} className="panel" onSubmit={changePassword}><h3>Alterar senha</h3><label>Senha atual<input name="current_password" type="password" required /></label><label>Nova senha<input name="new_password" type="password" minLength={4} required /></label><label>Confirmar nova senha<input name="confirm_password" type="password" minLength={4} required /></label><button className="primary-button">Salvar nova senha</button></form>
      <form ref={recoveryFormRef} className="panel" onSubmit={changeRecoveryKey}><h3>Chave de recuperação</h3><p>Guarde a chave fora do sistema. Ela permite redefinir sua senha sem ajuda do administrador.</p><label>Senha atual<input name="current_password" type="password" required /></label><label>Nova chave<input name="new_recovery_key" minLength={6} required /></label><button className="secondary-button">Salvar chave</button></form>
      <article className="panel"><h3>Perfil</h3><dl><dt>Nome</dt><dd>{user.display_name}</dd><dt>Usuário</dt><dd>{user.username}</dd><dt>E-mail</dt><dd>{user.email}</dd><dt>Permissão</dt><dd>{user.role === 'admin' ? 'Administrador' : 'Usuário'}</dd></dl></article>
      <article className="panel category-panel"><h3>Categorias</h3><form ref={categoryFormRef} className="category-form" onSubmit={createCategory}><input name="name" placeholder="Nova categoria" required /><select name="kind"><option value="expense">Despesa</option><option value="income">Renda</option></select><button className="secondary-button">Adicionar</button></form><div className="category-list">{categories.map((item) => <button key={item.id} className={item.is_active ? '' : 'inactive'} onClick={() => toggleCategory(item)}><span>{item.name}</span><small>{item.kind === 'expense' ? 'Despesa' : 'Renda'} • {item.is_active ? 'Ativa' : 'Oculta'}</small></button>)}</div></article>
      {user.role === 'admin' && <article className="panel backup-panel"><h3>Backup diário</h3><p>O sistema cria automaticamente um backup por dia e mantém os últimos 30 arquivos.</p><button className="secondary-button" onClick={createBackup}>Fazer backup agora</button><div className="backup-list">{backups.slice(0, 5).map((item) => <div key={item.name}><span>{item.name}</span><small>{Math.round(item.size / 1024)} KB</small></div>)}</div></article>}
      <article className="panel"><h3>{isNativeMobile() ? 'Aplicativo local' : 'Acesso local'}</h3>{isNativeMobile() ? <><p>Os dados deste aplicativo ficam no banco SQLite do celular.</p><p>O app funciona sem computador e sem internet, exceto quando você usa o login Google.</p></> : <><p>No computador: <code>http://localhost:8000</code></p><p>Na rede: <code>http://smartfinance.local:8000</code> ou pelo endereço IP.</p></>}</article>
    </section>
    {message && <div className="success-message">{message}</div>}{error && <div className="form-error">{error}</div>}
  </>
}
