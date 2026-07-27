import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { api, jsonBody, setToken } from '../services/api'
import { confirmAction } from '../services/confirm'
import { navigateTo } from '../services/navigation'
import { exportMobileDatabase, importMobileDatabase } from '../services/mobile/backup'
import {
  importTransferPackage,
  previewTransferPackage,
  type TransferImportMode,
  type TransferPreview,
} from '../services/mobile/transfer'
import { toast } from '../services/toast'
import type { Category, User } from '../types'

function formatPackageDate(value: string): string {
  if (!value) return 'Data não informada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR')
}

export default function SettingsPage({ user, onUser }: { user: User; onUser: (user: User) => void }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [transferFile, setTransferFile] = useState<File | null>(null)
  const [transferPreview, setTransferPreview] = useState<TransferPreview | null>(null)
  const [readingTransfer, setReadingTransfer] = useState(false)
  const [importingTransfer, setImportingTransfer] = useState(false)
  const [importingDatabase, setImportingDatabase] = useState(false)
  const passwordFormRef = useRef<HTMLFormElement>(null)
  const recoveryFormRef = useRef<HTMLFormElement>(null)
  const categoryFormRef = useRef<HTMLFormElement>(null)
  const transferInputRef = useRef<HTMLInputElement>(null)
  const databaseInputRef = useRef<HTMLInputElement>(null)

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
        ...jsonBody({ current_password: form.get('current_password'), new_password: form.get('new_password') }),
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
        ...jsonBody({ current_password: form.get('current_password'), new_recovery_key: form.get('new_recovery_key') }),
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

  async function exportDatabase() {
    try {
      setError('')
      const result = await exportMobileDatabase()
      setMessage(`${result.message}: ${result.name}`)
      toast.success('Banco de dados exportado', result.name)
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao exportar banco'
      setError(failure)
      toast.error('Não foi possível exportar o banco', failure)
    }
  }

  async function importDatabaseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const confirmed = await confirmAction({
      title: 'Importar banco completo?',
      message: 'O banco atual do aplicativo será substituído pelo arquivo selecionado.',
      detail: 'Antes da substituição, o Smart Finance criará automaticamente um backup local de segurança. Use somente um .db exportado pelo aplicativo Android.',
      confirmLabel: 'Criar backup e importar',
      tone: 'danger',
    })
    if (!confirmed) {
      event.target.value = ''
      return
    }

    setImportingDatabase(true)
    setError('')
    try {
      const result = await importMobileDatabase(file)
      setMessage(`${result.message}: ${result.name}`)
      setToken(null)
      localStorage.removeItem('smart-finance-owner-id')
      toast.success('Banco importado', 'O aplicativo será recarregado. Entre com um usuário existente no banco importado.')
      window.setTimeout(() => window.location.reload(), 1200)
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao importar banco'
      setError(failure)
      toast.error('Não foi possível importar o banco', failure)
    } finally {
      event.target.value = ''
      setImportingDatabase(false)
    }
  }

  async function selectTransferFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setTransferFile(null)
    setTransferPreview(null)
    setError('')
    if (!file) return

    setReadingTransfer(true)
    try {
      const preview = await previewTransferPackage(file)
      setTransferFile(file)
      setTransferPreview(preview)
      toast.success('Pacote reconhecido', `${preview.expenses} despesa(s), ${preview.incomes} renda(s) e ${preview.attachments} comprovante(s).`)
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Não foi possível ler o pacote'
      setError(failure)
      if (transferInputRef.current) transferInputRef.current.value = ''
      toast.error('Pacote inválido', failure)
    } finally {
      setReadingTransfer(false)
    }
  }

  async function importTransfer(mode: TransferImportMode) {
    if (!transferFile || !transferPreview) return

    const confirmed = await confirmAction({
      title: mode === 'replace' ? 'Substituir os dados do celular?' : 'Adicionar estes dados?',
      message: mode === 'replace'
        ? 'As informações financeiras atuais do usuário selecionado serão substituídas pelos dados do computador.'
        : 'Os dados do computador serão adicionados, evitando duplicações identificáveis.',
      detail: 'Antes da importação, o aplicativo criará automaticamente um backup completo do banco atual.',
      confirmLabel: mode === 'replace' ? 'Criar backup e substituir' : 'Criar backup e adicionar',
      tone: mode === 'replace' ? 'danger' : 'warning',
    })
    if (!confirmed) return

    setImportingTransfer(true)
    setError('')
    try {
      const ownerId = Number(localStorage.getItem('smart-finance-owner-id')) || user.id
      const result = await importTransferPackage(transferFile, ownerId, mode)
      const data = result.imported
      const skipped = result.skippedAttachments
      const summary = `${data.expenses} despesas, ${data.incomes} rendas, ${data.accounts} contas, ${data.cards} cartões e ${data.attachments} comprovantes importados.`
      setMessage(skipped ? `${summary} ${skipped} comprovante(s) não puderam ser copiados.` : summary)
      setTransferFile(null)
      setTransferPreview(null)
      if (transferInputRef.current) transferInputRef.current.value = ''
      await loadCategories()
      toast.success('Importação concluída', result.backupCreated ? 'O backup anterior foi criado. Abrindo a Visão geral com os dados importados.' : summary)
      navigateTo('dashboard')
    } catch (err) {
      const failure = err instanceof Error ? err.message : 'Erro ao importar os dados'
      setError(failure)
      toast.error('Não foi possível importar', failure)
    } finally {
      setImportingTransfer(false)
    }
  }

  return <>
    <PageHeader title="Configurações" subtitle="Segurança, categorias, importação, backups e informações do sistema" />
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

      <article className="panel transfer-panel">
        <div className="panel-title-row"><div><span className="panel-kicker">Computador → celular</span><h3>Importar dados do computador</h3></div><span className="panel-icon" aria-hidden="true">📥</span></div>
        <p>Selecione o ZIP criado pelo botão “Exportar dados para o celular” no Smart Finance do computador.</p>
        <input ref={transferInputRef} className="transfer-file-input" type="file" accept=".zip,application/zip" onChange={selectTransferFile} />
        <button type="button" className="secondary-button" disabled={readingTransfer || importingTransfer} onClick={() => transferInputRef.current?.click()}>
          {readingTransfer ? 'Lendo pacote...' : 'Importar dados do computador'}
        </button>

        {transferPreview && <div className="transfer-preview">
          <div>
            <strong>Dados de {transferPreview.profileName}</strong>
            <small className="muted-text block">Exportado em {formatPackageDate(transferPreview.createdAt)}</small>
          </div>
          <div className="transfer-preview-grid">
            <span>Contas<b>{transferPreview.accounts}</b></span>
            <span>Cartões<b>{transferPreview.cards}</b></span>
            <span>Rendas<b>{transferPreview.incomes}</b></span>
            <span>Despesas<b>{transferPreview.expenses}</b></span>
            <span>Empréstimos<b>{transferPreview.loans}</b></span>
            <span>Comprovantes<b>{transferPreview.attachments}</b></span>
          </div>
          <div className="settings-button-row">
            <button type="button" className="primary-button" disabled={importingTransfer} onClick={() => importTransfer('replace')}>
              {importingTransfer ? 'Importando...' : 'Substituir meus dados'}
            </button>
            <button type="button" className="secondary-button" disabled={importingTransfer} onClick={() => importTransfer('merge')}>Adicionar aos dados atuais</button>
          </div>
        </div>}
        <small className="muted-text">Um backup automático é criado antes de qualquer importação. Usuários e senhas do APK não são alterados.</small>
      </article>

      <article className="panel category-panel">
        <h3>Categorias</h3>
        <form ref={categoryFormRef} className="category-form" onSubmit={createCategory}>
          <input name="name" placeholder="Nova categoria" required />
          <select name="kind"><option value="expense">Despesa</option><option value="income">Renda</option></select>
          <button className="secondary-button">Adicionar</button>
        </form>
        <div className="category-list">{categories.map((item) => <button key={item.id} className={item.is_active ? '' : 'inactive'} onClick={() => toggleCategory(item)}>
          <span>{item.name}</span><small>{item.kind === 'expense' ? 'Despesa' : 'Renda'} • {item.is_active ? 'Ativa' : 'Oculta'}</small>
        </button>)}</div>
      </article>

      {user.role === 'admin' && <article className="panel backup-panel">
        <div className="panel-title-row"><div><span className="panel-kicker">Segurança local</span><h3>Backup e banco de dados</h3></div><span className="panel-icon" aria-hidden="true">🗄️</span></div>
        <p>O backup diário continua automático. Exporte o banco para Downloads ou restaure um arquivo .db gerado pelo próprio aplicativo Android.</p>
        <input ref={databaseInputRef} className="transfer-file-input" type="file" accept=".db,application/vnd.sqlite3,application/octet-stream" onChange={importDatabaseFile} />
        <div className="settings-button-row">
          <button type="button" className="primary-button" onClick={exportDatabase}>Exportar banco</button>
          <button type="button" className="secondary-button" onClick={() => databaseInputRef.current?.click()} disabled={importingDatabase}>{importingDatabase ? 'Importando banco...' : 'Importar banco'}</button>
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
