import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth-context'
import { formatDate } from '../format'
import type { OccurrenceListItem, OccurrenceStatus, Priority } from '../types'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'

export function OccurrencesPage() {
  const { session } = useAuth()
  const manager = session?.user.role === 'Gestor'
  const [items, setItems] = useState<OccurrenceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<OccurrenceStatus | ''>('')
  const [priority, setPriority] = useState<Priority | ''>('')

  async function load() {
    setLoading(true); setError('')
    const query = new URLSearchParams()
    if (category) query.set('category', category)
    if (status) query.set('status', status)
    if (priority) query.set('priority', priority)
    try { setItems(await api<OccurrenceListItem[]>(`/api/occurrences?${query}`)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    api<OccurrenceListItem[]>('/api/occurrences')
      .then(result => { if (active) setItems(result) })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  function filter(event: FormEvent) { event.preventDefault(); void load() }

  return <>
    <div className="page-heading occurrence-heading">
      <div><p className="context-label">{manager ? 'Fila da equipe' : 'Seus registros'}</p><h1>Ocorrências</h1><p>{manager ? 'Priorize a fila e mantenha cada atendimento em movimento.' : 'Consulte o andamento e converse com a equipe responsável.'}</p></div>
      <div className="heading-actions">{!loading && <span className="result-count"><strong>{items.length}</strong>{items.length === 1 ? 'registro visível' : 'registros visíveis'}</span>}{!manager && <Link className="button primary" to="/ocorrencias/nova">Registrar ocorrência</Link>}</div>
    </div>
    {manager && <form className="filter-bar" onSubmit={filter}>
      <label><span>Categoria</span><input value={category} onChange={event => setCategory(event.target.value)} placeholder="Ex.: Iluminação" /></label>
      <label><span>Status</span><select value={status} onChange={event => setStatus(event.target.value as OccurrenceStatus | '')}><option value="">Todos</option><option value="Aberta">Aberta</option><option value="EmAnalise">Em análise</option><option value="EmAtendimento">Em atendimento</option><option value="Resolvida">Resolvida</option><option value="Cancelada">Cancelada</option></select></label>
      <label><span>Prioridade</span><select value={priority} onChange={event => setPriority(event.target.value as Priority | '')}><option value="">Todas</option><option value="Baixa">Baixa</option><option value="Media">Média</option><option value="Alta">Alta</option><option value="Critica">Crítica</option></select></label>
      <button className="button secondary">Aplicar filtros</button>
    </form>}
    {error && <div className="alert error">{error}</div>}
    {loading ? <div className="loading">Organizando a fila…</div> : items.length === 0 ? <div className="empty-state"><span>R</span><h2>Nenhuma ocorrência nesta fila</h2><p>{manager ? 'Remova algum filtro ou aguarde um novo registro.' : 'Registre o primeiro problema para começar o acompanhamento.'}</p>{!manager && <Link className="button primary" to="/ocorrencias/nova">Registrar ocorrência</Link>}</div> :
      <div className="occurrence-list">{items.map(item => <Link to={`/ocorrencias/${item.id}`} className={`occurrence-card priority-edge-${item.priority.toLowerCase()}`} key={item.id}>
        <div className="order-code"><span>OS</span><strong>{item.id.slice(0, 6).toUpperCase()}</strong></div>
        <div className="order-body"><div className="card-badges"><StatusBadge status={item.status} /><PriorityBadge priority={item.priority} /></div><h2>{item.title}</h2><dl className="order-facts"><div><dt>Categoria</dt><dd>{item.category}</dd></div><div><dt>Local</dt><dd>{item.location}</dd></div>{manager && <div><dt>Solicitante</dt><dd>{item.requester.name}</dd></div>}</dl></div>
        <div className="card-meta"><span>{item.assignee ? `Responsável: ${item.assignee.name}` : 'Aguardando responsável'}</span><time dateTime={item.updatedAt}>Atualizada em {formatDate(item.updatedAt)}</time><b>Abrir ocorrência</b></div>
      </Link>)}</div>}
  </>
}
