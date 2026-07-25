import { FormEvent, useState } from 'react'
import { api, jsonBody, setToken } from '../services/api'
import { toast } from '../services/toast'
import type { User } from '../types'

export default function AuthPage({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(event.currentTarget)
    try {
      if (mode === 'login') {
        const response = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', ...jsonBody({ identifier: form.get('identifier'), password: form.get('password') }) })
        setToken(response.token)
        onAuthenticated(response.user)
        toast.success('Login realizado', `Bem-vindo, ${response.user.display_name}.`)
      } else if (mode === 'register') {
        const response = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', ...jsonBody({ username: form.get('username'), display_name: form.get('display_name'), email: form.get('email'), password: form.get('password'), recovery_key: form.get('recovery_key') }) })
        setToken(response.token)
        onAuthenticated(response.user)
        toast.success('Conta criada', `Bem-vindo, ${response.user.display_name}.`)
      } else {
        await api('/auth/recover', { method: 'POST', ...jsonBody({ identifier: form.get('identifier'), recovery_key: form.get('recovery_key'), new_password: form.get('new_password') }) })
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

  return <div className="auth-layout">
    <section className="auth-hero">
      <div className="hero-logo">▥</div>
      <h1>Smart Finance</h1>
      <p>Organize rendas, despesas, cartões e empréstimos no próprio celular, mesmo sem internet.</p>
      <div className="hero-feature"><b>✓</b><span>Banco SQLite privado no aparelho</span></div>
      <div className="hero-feature"><b>✓</b><span>Relatório mensal em PDF</span></div>
      <div className="hero-feature"><b>✓</b><span>Login local protegido por usuário e senha</span></div>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <h2>{mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Recuperar senha'}</h2>
        <p>{mode === 'login' ? 'Entre com seu usuário ou e-mail e senha.' : mode === 'register' ? 'Crie sua conta local neste celular.' : 'Use a chave de recuperação criada no cadastro.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <>
            <label>Nome de usuário<input name="username" minLength={3} required /></label>
            <label>Nome a ser exibido<input name="display_name" required /></label>
            <label>E-mail<input name="email" type="email" required /></label>
          </>}
          {mode !== 'register' && <label>Usuário ou e-mail<input name="identifier" required /></label>}
          {mode === 'login' && <label>Senha<input name="password" type="password" required /></label>}
          {mode === 'register' && <>
            <label>Senha<input name="password" type="password" minLength={4} required /></label>
            <label>Chave de recuperação<input name="recovery_key" minLength={6} required /><small>Guarde esta chave fora do aplicativo.</small></label>
          </>}
          {mode === 'recover' && <>
            <label>Chave de recuperação<input name="recovery_key" required /></label>
            <label>Nova senha<input name="new_password" type="password" minLength={4} required /></label>
          </>}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar' : 'Redefinir senha'}</button>
        </form>
        <div className="auth-links">
          {mode !== 'login' && <button onClick={() => setMode('login')}>Voltar ao login</button>}
          {mode === 'login' && <><button onClick={() => setMode('register')}>Criar conta</button><button onClick={() => setMode('recover')}>Esqueci a senha</button></>}
        </div>
        {mode === 'login' && <div className="default-admin"><strong>Conta inicial:</strong> Admin / 1234</div>}
      </div>
    </section>
  </div>
}
