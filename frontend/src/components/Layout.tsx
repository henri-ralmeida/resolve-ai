import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth-context'

export function Layout() {
  const { session, logout } = useAuth()
  const manager = session?.user.role === 'Gestor'
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/ocorrencias" className="brand" aria-label="Resolve Aí - início">
          <span className="brand-mark">R</span>
          <span className="brand-copy">Resolve <strong>Aí</strong><small>Ocorrências em ordem</small></span>
        </Link>
        <nav aria-label="Navegação principal">
          {manager && <NavLink to="/dashboard">Dashboard</NavLink>}
          <NavLink to="/ocorrencias" end>Ocorrências</NavLink>
          {!manager && <NavLink to="/ocorrencias/nova" end>Nova ocorrência</NavLink>}
        </nav>
        <div className="user-menu">
          <span><strong>{session?.user.name}</strong><small>{manager ? 'Gestor' : 'Solicitante'}</small></span>
          <button className="button ghost compact" onClick={logout}>Sair</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
      <footer><strong>Resolve Aí</strong><span>Gestão rastreável de ocorrências</span></footer>
    </div>
  )
}
