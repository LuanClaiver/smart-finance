import { FormEvent, useState } from 'react'
import { api, jsonBody, setToken } from '../services/api'
import type { AppTheme } from '../services/theme'
import { toast } from '../services/toast'
import type { User } from '../types'

type AuthMode = 'login' | 'register' | 'recover'

type Props = {
  onAuthenticated: (user: User) => void
  theme: AppTheme
  onToggleTheme: () => void
}

export default function AuthPage({ onAuthenticated, theme, onToggleTheme }: Props) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)

    try {
      if (mode === 'login') {
        const response = await api<{ token: string; user: User }>('/auth/login', {
          method: 'POST',
          ...jsonBody({ identifier: form.get('identifier'), password: form.get('password') }),
        })
        setToken(response.token)
        onAuthenticated(response.user)
        toast.success('Login realizado', `Bem-vindo, ${response.user.display_name}.`)
      } else if (mode === 'register') {
        const response = await api<{ token: string; user: User }>('/auth/register', {
          method: 'POST',
          ...jsonBody({
            username: form.get('username'),
            display_name: form.get('display_name'),
            email: form.get('email'),
            password: form.get('password'),
            recovery_key: form.get('recovery_key'),
          }),
        })
        setToken(response.token)
        onAuthenticated(response.user)
        toast.success('Conta criada', `Bem-vindo, ${response.user.display_name}.`)
      } else {
        await api('/auth/recover', {
          method: 'POST',
          ...jsonBody({
            identifier: form.get('identifier'),
            recovery_key: form.get('recovery_key'),
            new_password: form.get('new_password'),
          }),
        })
        setMode('login')
        toast.success('Senha redefinida', 'Você já pode entrar com a nova senha.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha na autenticação'
      setError(message)
      toast.error('Operação não concluída', message)
    } finally {
      setLoading(false)
    }
  }

  const title = mode === 'login' ? 'Entrar no sistema' : mode === 'register' ? 'Criar uma conta' : 'Recuperar senha'
  const subtitle = mode === 'login'
    ? 'Acesse com seu usuário ou e-mail.'
    : mode === 'register'
      ? 'Crie um perfil local e mantenha seus dados separados.'
      : 'Informe sua chave de recuperação para definir uma nova senha.'

  return <div className="auth-screen">
    <div className="auth-glow auth-glow-left" />
    <div className="auth-glow auth-glow-right" />

    <main className="auth-frame">
      <section className="auth-hero">
        <div className="auth-version-badge">
          <img src="/icon.svg" alt="" />
          <span>Smart Finance <b>0.4.0</b></span>
        </div>

        <div className="auth-hero-copy">
          <span className="auth-eyebrow">Controle financeiro pessoal</span>
          <h1>Organize hoje. Decida melhor amanhã.</h1>
          <p>Tenha rendas, despesas, contas, cartões e empréstimos em um só lugar, com dados locais e separados por usuário.</p>
        </div>

        <div className="auth-feature-grid">
          <article><strong>🔐</strong><span>Dados privados</span></article>
          <article><strong>📊</strong><span>Visão completa</span></article>
          <article><strong>📱</strong><span>PC e celular</span></article>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-brand-row">
          <div className="auth-brand-copy">
            <img src="/icon.svg" alt="Logo Smart Finance" />
            <div><strong>Smart Finance</strong><span>Versão 0.4.0</span></div>
          </div>
          <button type="button" className="theme-toggle auth-theme-toggle" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="auth-heading">
          <span>Acesso</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <form onSubmit={submit} autoComplete="off">
          {mode === 'register' && <>
            <label>Nome de exibição
              <input name="display_name" required maxLength={80} autoComplete="name" placeholder="Ex.: João D’Ávila-Silva" />
              <small>Aceita espaços, acentos, apóstrofo e hífen.</small>
            </label>
            <label>Nome de usuário
              <input name="username" minLength={3} maxLength={30} required autoComplete="username" spellCheck={false} placeholder="Ex.: joao.silva" />
            </label>
            <label>E-mail
              <input name="email" type="email" required autoComplete="email" placeholder="seuemail@exemplo.com" />
            </label>
          </>}

          {mode !== 'register' && <label>Usuário ou e-mail
            <input name="identifier" required autoComplete="username" placeholder="Usuário ou e-mail" />
          </label>}

          {mode === 'login' && <label>Senha
            <input name="password" type="password" required autoComplete="current-password" placeholder="Digite sua senha" />
          </label>}

          {mode === 'register' && <>
            <label>Senha
              <input name="password" type="password" minLength={4} required autoComplete="new-password" placeholder="Crie uma senha" />
            </label>
            <label>Chave de recuperação
              <input name="recovery_key" minLength={6} required autoComplete="off" placeholder="Crie uma chave segura" />
              <small>Guarde essa chave fora do sistema.</small>
            </label>
          </>}

          {mode === 'recover' && <>
            <label>Chave de recuperação
              <input name="recovery_key" required autoComplete="off" placeholder="Digite sua chave" />
            </label>
            <label>Nova senha
              <input name="new_password" type="password" minLength={4} required autoComplete="new-password" placeholder="Digite a nova senha" />
            </label>
          </>}

          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" disabled={loading}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar' : 'Redefinir senha'}
          </button>
        </form>

        <div className="auth-links">
          {mode !== 'login' && <button type="button" onClick={() => { setError(''); setMode('login') }}>Voltar ao login</button>}
          {mode === 'login' && <>
            <button type="button" onClick={() => { setError(''); setMode('register') }}>Criar uma nova conta</button>
            <button type="button" onClick={() => { setError(''); setMode('recover') }}>Esqueci minha senha</button>
          </>}
        </div>
      </section>
    </main>
  </div>
}
