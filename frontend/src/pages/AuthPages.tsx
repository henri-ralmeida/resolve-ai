import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth-context'

function AuthFrame({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand light"><span className="brand-mark">R</span><span className="brand-copy">Resolve <strong>Aí</strong><small>Ocorrências em ordem</small></span></div>
        <p className="context-label">Do chamado à solução</p>
        <h1>Cada problema encontra um caminho claro.</h1>
        <p>Registre o que aconteceu, acompanhe quem assumiu e veja cada mudança até a resolução.</p>
        <div className="field-ticket" aria-label="Exemplo de acompanhamento de ocorrência">
          <div className="field-ticket-head"><span>Ocorrência RA-0042</span><strong>Em atendimento</strong></div>
          <h2>Iluminação da entrada</h2>
          <div className="flow-preview" aria-label="Fluxo da ocorrência">
            <span className="done">Aberta</span><i /><span className="done">Em análise</span><i /><span className="current">Em atendimento</span><i /><span>Resolvida</span>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="context-label">Acesso à plataforma</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
          {children}
        </div>
      </section>
    </main>
  )
}

export function LoginPage() {
  const { session, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to={session.user.role === 'Gestor' ? '/dashboard' : '/ocorrencias'} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.')
    } finally { setBusy(false) }
  }

  return <AuthFrame title="Acesse sua conta" description="Entre para acompanhar ou administrar ocorrências.">
    <form onSubmit={submit} className="stack-form">
      <label>E-mail<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
      {error && <div className="alert error" role="alert">{error}</div>}
      <button className="button primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
    </form>
    <p className="auth-switch">Ainda não tem conta? <Link to="/cadastro">Criar conta</Link></p>
    <aside className="demo-hint"><strong>Acesso do Gestor local</strong><span>gestor@resolveai.local</span><span>Senha: Gestor123!</span></aside>
  </AuthFrame>
}

export function RegisterPage() {
  const { session, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (session) return <Navigate to="/ocorrencias" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      await register(name, email, password)
      navigate('/ocorrencias')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a conta.')
    } finally { setBusy(false) }
  }

  return <AuthFrame title="Crie sua conta" description="O cadastro público cria um perfil Solicitante.">
    <form onSubmit={submit} className="stack-form">
      <label>Nome completo<input value={name} onChange={event => setName(event.target.value)} minLength={2} required /></label>
      <label>E-mail<input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>Senha<input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required /><small>Mínimo de 8 caracteres</small></label>
      {error && <div className="alert error" role="alert">{error}</div>}
      <button className="button primary" disabled={busy}>{busy ? 'Criando…' : 'Criar conta'}</button>
    </form>
    <p className="auth-switch">Já tem conta? <Link to="/login">Entrar</Link></p>
  </AuthFrame>
}
