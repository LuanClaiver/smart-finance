import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { api, jsonBody, setToken } from '../services/api'
import { confirmAction } from '../services/confirm'
import { toast } from '../services/toast'
import type { Category, User } from '../types'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function waitForServerRestart(): Promise<void> {
  // Primeiro esperamos o processo antigo realmente sair. Só então aceitamos
  // um novo /health como confirmação de que a reinicialização terminou.
  const deadline = Date.now() + 45_000
  let oldServerStopped = false

  await new Promise((resolve) => window.setTimeout(resolve, 700))

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`/api/health?after-import=${Date.now()}`, { cache: 'no-store' })
      if (oldServerStopped && response.ok) {
        window.location.reload()
        return
      }
    } catch {
      oldServerStopped = true
    }
    await new Promise((resolve) => window.setTimeout(resolve, 400))
  }

  window.location.reload()
}

export default function SettingsPage({ user, onUser }: { user: User; onUser: (user: User) => void }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [importingDatabase, setImportingDatabase] = useState(false)
  const [exportingTransfer, setExportingTransfer] = useState(false)
  const [importingSync, setImportingSync] = useState(false)
  const passwordFormRef = useRef<HTMLFormElement>(null)
  const recoveryFormRef = useRef<HTMLFormElement>(null)
  const categoryFormRef = useRef<HTMLFormElement>(null)

  const loadCategories = () => api<Category[]>('/categories').then(setCategories).catch(() => undefined)

  useEffect(() => {
    void loadCategories()
  }, [user.role])

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)

    if (form.get('new_password') !== form.get('confirm_password')) {
      const warning = 'As novas senhas não conferem.'
      setError(warning)
      toast.warning('Verifique as senhas', warning)
      return
    }

    try {
      const response = await api<{ message: string; token: string }>('/auth/change-password', {
        method: 'POST',
        ...jsonBody({
          current_password: form.get('current_password'),
          new_password: form.get('new_password'),
        }),
      })
      setToken(response.token)
      setMessage(response.message)
      passwordFormRef.current?.reset()
      onUser(await api<User>('/auth/me'))
      toast.success('Senha alterada', response.message)
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao alterar senha'
      setError(failure)
      toast.error('Não foi possível alterar a senha', failure)
    }
  }

  async function changeRecoveryKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)

    try {
      const response = await api<{ message: string }>('/auth/change-recovery-key', {
        method: 'POST',
        ...jsonBody({
          current_password: form.get('current_password'),
          new_recovery_key: form.get('new_recovery_key'),
        }),
      })
      setMessage(response.message)
      recoveryFormRef.current?.reset()
      toast.success('Chave de recuperação alterada', response.message)
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao alterar chave'
      setError(failure)
      toast.error('Não foi possível alterar a chave', failure)
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    const form = new FormData(event.currentTarget)

    try {
      await api('/categories', {
        method: 'POST',
        ...jsonBody({ name: form.get('name'), kind: form.get('kind'), is_active: true }),
      })
      setMessage('Categoria criada.')
      categoryFormRef.current?.reset()
      await loadCategories()
      toast.success('Categoria criada', String(form.get('name')))
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao criar categoria'
      setError(failure)
      toast.error('Não foi possível criar a categoria', failure)
    }
  }

  async function toggleCategory(item: Category) {
    try {
      await api(`/categories/${item.id}`, {
        method: 'PATCH',
        ...jsonBody({ name: item.name, kind: item.kind, is_active: !item.is_active }),
      })
      await loadCategories()
      toast.success(item.is_active ? 'Categoria ocultada' : 'Categoria ativada', item.name)
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao atualizar categoria'
      setError(failure)
      toast.error('Não foi possível atualizar a categoria', failure)
    }
  }


  async function exportTransferPackage() {
    setExportingTransfer(true)
    setError('')
    try {
      const blob = await api<Blob>('/transfer/export')
      const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      downloadBlob(blob, `smart-finance-para-celular-${date}.zip`)
      toast.success('Pacote para o celular criado', 'Abra o Smart Finance no celular e importe o ZIP em Configurações.')
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao criar pacote para o celular'
      setError(failure)
      toast.error('Não foi possível exportar para o celular', failure)
    } finally {
      setExportingTransfer(false)
    }
  }

  async function importSyncFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setImportingSync(true); setError('')
    try {
      const confirmed = await confirmAction({ title: 'Sincronizar dados do celular?', message: 'Os lançamentos e cadastros do pacote serão mesclados aos dados deste usuário.', detail: 'O Smart Finance cria um backup automático antes da mesclagem e tenta evitar duplicações pelos identificadores dos lançamentos.', confirmLabel: 'Criar backup e sincronizar', tone: 'warning' })
      if (!confirmed) return
      const body = new FormData(); body.append('upload', file)
      const result = await api<{ message: string; backup: string; imported: Record<string, number> }>('/sync/import', { method: 'POST', body })
      const total = Object.values(result.imported || {}).reduce((sum, value) => sum + Number(value || 0), 0)
      setMessage(`${result.message}. ${total} registro(s) novo(s). Backup: ${result.backup}`)
      toast.success('Sincronização concluída', `${total} registro(s) novo(s) foram incorporados ao computador.`)
    } catch (err) { const failure = err instanceof Error ? err.message : 'Erro ao sincronizar'; setError(failure); toast.error('Não foi possível sincronizar', failure) }
    finally { event.target.value = ''; setImportingSync(false) }
  }

  async function exportDatabase() {
    try {
      setError('')
      const blob = await api<Blob>('/backups/export-database')
      downloadBlob(blob, `smart-finance-${new Date().toISOString().slice(0, 10)}.db`)
      toast.success('Banco de dados exportado', 'O arquivo SQLite foi enviado para a pasta Downloads do navegador.')
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao exportar banco'
      setError(failure)
      toast.error('Não foi possível exportar o banco', failure)
    }
  }

  async function importDatabaseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImportingDatabase(true)
    setError('')
    setMessage('')

    try {
      const inspectBody = new FormData()
      inspectBody.append('upload', file)
      const preview = await api<{ valid: boolean; size: number; table_count: number; counts: Record<string, number>; integrity: string }>('/backups/inspect-database', { method: 'POST', body: inspectBody })
      const confirmed = await confirmAction({
        title: 'Importar este banco?',
        message: `Banco íntegro: ${preview.table_count} tabelas, ${preview.counts.expenses || 0} despesas, ${preview.counts.incomes || 0} rendas e ${preview.counts.users || 0} usuário(s).`,
        detail: `Tamanho: ${(preview.size / 1024).toFixed(1)} KB. O banco atual será salvo em backup antes da substituição.`,
        confirmLabel: 'Criar backup e importar', tone: 'danger',
      })
      if (!confirmed) return
      const body = new FormData()
      body.append('upload', file)
      const response = await api<{
        message: string
        restart_required: boolean
        automatic_restart: boolean
        safety_backup: string
      }>('/backups/import-database', { method: 'POST', body })
      setMessage(`${response.message} Backup de segurança: ${response.safety_backup}`)
      setToken(null)

      if (response.automatic_restart) {
        toast.success('Banco importado', 'Aguarde a reinicialização automática. Depois, entre novamente com os usuários do banco importado.')
        await waitForServerRestart()
      } else {
        toast.success('Banco importado', 'Reinicie o Smart Finance e entre novamente com os usuários do banco importado.')
        window.setTimeout(() => window.location.reload(), 1200)
      }
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao importar banco'
      setError(failure)
      toast.error('Não foi possível importar o banco', failure)
    } finally {
      event.target.value = ''
      setImportingDatabase(false)
    }
  }

  return <>
    <PageHeader title="Configurações" subtitle="Segurança, categorias, backups e informações do sistema" />
    {user.must_change_password && <div className="warning-banner">A conta ainda usa uma senha temporária. Altere-a antes de continuar usando o sistema.</div>}
    <section className="settings-grid">
      <form ref={passwordFormRef} className="panel" onSubmit={changePassword}>
        <h3>Alterar senha</h3>
        <label>Senha atual<input name="current_password" type="password" required /></label>
        <label>Nova senha<input name="new_password" type="password" minLength={4} required /></label>
        <label>Confirmar nova senha<input name="confirm_password" type="password" minLength={4} required /></label>
        <button className="primary-button">Salvar nova senha</button>
      </form>

      <form ref={recoveryFormRef} className="panel" onSubmit={changeRecoveryKey}>
        <h3>Chave de recuperação</h3>
        <p>Guarde a chave fora do sistema. Ela permite redefinir sua senha sem ajuda do administrador.</p>
        <label>Senha atual<input name="current_password" type="password" required /></label>
        <label>Nova chave<input name="new_recovery_key" minLength={6} required /></label>
        <button className="secondary-button">Salvar chave</button>
      </form>

      <article className="panel">
        <h3>Perfil</h3>
        <dl>
          <dt>Nome</dt><dd>{user.display_name}</dd>
          <dt>Usuário</dt><dd>{user.username}</dd>
          <dt>E-mail</dt><dd>{user.email}</dd>
          <dt>Permissão</dt><dd>{user.role === 'admin' ? 'Administrador' : 'Usuário'}</dd>
        </dl>
      </article>

      <article className="panel transfer-panel transfer-desktop-panel">
        <div className="panel-title-row">
          <div><span className="panel-kicker">Computador → celular</span><h3>Transferir dados para o celular</h3></div>
          <span className="panel-icon" aria-hidden="true">📱</span>
        </div>
        <p>Crie um ZIP compatível com o aplicativo Android. O pacote inclui contas, cartões, categorias, rendas, despesas, empréstimos, parcelas e comprovantes do usuário selecionado.</p>
        <ol className="transfer-steps">
          <li>Exporte o pacote neste computador.</li>
          <li>Envie o arquivo ZIP para o celular.</li>
          <li>No APK, abra Configurações e toque em “Importar dados do computador”.</li>
        </ol>
        <button type="button" className="primary-button" onClick={exportTransferPackage} disabled={exportingTransfer}>{exportingTransfer ? 'Preparando pacote...' : 'Exportar dados para o celular'}</button>
      </article>

      <article className="panel transfer-panel sync-panel">
        <div className="panel-title-row"><div><span className="panel-kicker">Celular → computador</span><h3>Sincronizar alterações do APK</h3></div><span className="panel-icon" aria-hidden="true">🔄</span></div>
        <p>No celular, use “Criar pacote .sfsync”. Aqui, selecione o arquivo para mesclar despesas, rendas, cartões, recorrências, orçamentos, metas e transferências.</p>
        <label className="secondary-button file-action-button"><input type="file" accept=".sfsync,application/json" onChange={importSyncFile} disabled={importingSync}/>{importingSync?'Sincronizando...':'Importar pacote .sfsync'}</label>
        <small className="muted-text">Um backup é criado antes de cada sincronização.</small>
      </article>

      <article className="panel category-panel">
        <h3>Categorias</h3>
        <form ref={categoryFormRef} className="category-form" onSubmit={createCategory}>
          <input name="name" placeholder="Nova categoria" required />
          <select name="kind"><option value="expense">Despesa</option><option value="income">Renda</option></select>
          <button className="secondary-button">Adicionar</button>
        </form>
        <div className="category-list">
          {categories.map((item) => <button key={item.id} className={item.is_active ? '' : 'inactive'} onClick={() => toggleCategory(item)}>
            <span>{item.name}</span>
            <small>{item.kind === 'expense' ? 'Despesa' : 'Renda'} • {item.is_active ? 'Ativa' : 'Oculta'}</small>
          </button>)}
        </div>
      </article>

      {user.role === 'admin' && <article className="panel backup-panel">
        <div className="panel-title-row"><div><span className="panel-kicker">Segurança local</span><h3>Backup e banco de dados</h3></div><span className="panel-icon" aria-hidden="true">🗄️</span></div>
        <p>O backup diário interno continua automático. Para movimentar o banco completo, use somente as opções abaixo.</p>
        <div className="settings-button-row">
          <button type="button" className="primary-button" onClick={exportDatabase}>Exportar banco</button>
          <label className="secondary-button file-action-button">
            <input type="file" accept=".db,application/vnd.sqlite3,application/octet-stream" onChange={importDatabaseFile} disabled={importingDatabase} />
            {importingDatabase ? 'Importando banco...' : 'Importar banco'}
          </label>
        </div>
      </article>}

      <article className="panel developer-panel">
        <h3>Sobre o aplicativo</h3>
        <p>Aplicativo desenvolvido por Luan Claiver 2026</p>
        <a className="secondary-button github-project-button" href="https://github.com/LuanClaiver/smart-finance" target="_blank" rel="noreferrer">Abrir projeto no GitHub</a>
      </article>
    </section>
    {message && <div className="success-message">{message}</div>}
    {error && <div className="form-error">{error}</div>}
  </>
}
