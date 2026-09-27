import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider } from './auth'
import { useAuth } from './auth-context'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { NewOccurrencePage } from './pages/NewOccurrencePage'
import { OccurrenceDetailPage } from './pages/OccurrenceDetailPage'
import { OccurrencesPage } from './pages/OccurrencesPage'
import './App.css'

function ProtectedLayout() {
  const { session } = useAuth()
  return session ? <Layout /> : <Navigate to="/login" replace />
}

function ManagerOnly({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return session?.user.role === 'Gestor' ? children : <Navigate to="/ocorrencias" replace />
}

function RequesterOnly({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return session?.user.role === 'Solicitante' ? children : <Navigate to="/ocorrencias" replace />
}

function Home() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={session.user.role === 'Gestor' ? '/dashboard' : '/ocorrencias'} replace />
}

function App() {
  return <BrowserRouter><AuthProvider><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/cadastro" element={<RegisterPage />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/dashboard" element={<ManagerOnly><DashboardPage /></ManagerOnly>} />
      <Route path="/ocorrencias" element={<OccurrencesPage />} />
      <Route path="/ocorrencias/nova" element={<RequesterOnly><NewOccurrencePage /></RequesterOnly>} />
      <Route path="/ocorrencias/:id" element={<OccurrenceDetailPage />} />
    </Route>
    <Route path="/" element={<Home />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AuthProvider></BrowserRouter>
}

export default App
