import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, assetUrl } from '../api'
import { useAuth } from '../auth-context'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'
import { formatDate, formatPriority, formatStatus, formatTransitionAction } from '../format'
import type { OccurrenceDetail, OccurrenceStatus, Person, Priority } from '../types'

const progressStages: OccurrenceStatus[] = ['Aberta', 'EmAnalise', 'EmAtendimento', 'Resolvida']

export function OccurrenceDetailPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const manager = session?.user.role === 'Gestor'
  const [item, setItem] = useState<OccurrenceDetail>()
  const [managers, setManagers] = useState<Person[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const occurrence = await api<OccurrenceDetail>(`/api/occurrences/${id}`)
      setItem(occurrence)
      if (manager) setManagers(await api<Person[]>('/api/users/managers'))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao carregar.') }
  }, [id, manager])
  useEffect(() => {
    let active = true
    const occurrence = api<OccurrenceDetail>(`/api/occurrences/${id}`)
    const people = manager ? api<Person[]>('/api/users/managers') : Promise.resolve([])
    Promise.all([occurrence, people])
      .then(([loadedItem, loadedManagers]) => {
        if (!active) return
        setItem(loadedItem)
        setManagers(loadedManagers)
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar.') })
    return () => { active = false }
  }, [id, manager])

  async function action(name: string, path: string, method: 'POST' | 'PATCH', body: object) {
    setBusy(name); setError('')
    try { await api(path, { method, body: JSON.stringify(body) }); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha na operação.') }
    finally { setBusy('') }
  }

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const text = String(form.get('text') ?? '')
    void action('comment', `/api/occurrences/${id}/comments`, 'POST', { text }).then(() => formElement.reset())
  }

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void action('status', `/api/occurrences/${id}/status`, 'PATCH', { status: form.get('status'), observation: form.get('observation') })
  }

  function submitSolution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const solution = String(new FormData(event.currentTarget).get('solution') ?? '')
    void action('solution', `/api/occurrences/${id}/solution`, 'PATCH', { solution })
  }

  function submitEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    void action('evaluation', `/api/occurrences/${id}/evaluation`, 'POST', { score: Number(form.get('score')), comment: form.get('comment') })
  }

  if (!item) return <div className="loading">{error || 'Carregando ocorrência…'}</div>
  const progressIndex = progressStages.indexOf(item.status)
  return <>
    <Link to="/ocorrencias" className="back-link">Voltar às ocorrências</Link>
    <div className="detail-heading"><div><div className="ticket-line"><span>Ocorrência</span><strong>RA-{item.id.slice(0, 8).toUpperCase()}</strong></div><div className="card-badges"><StatusBadge status={item.status} /><PriorityBadge priority={item.priority} /></div><h1>{item.title}</h1><p className="detail-date">Registrada em <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></p></div></div>
    {error && <div className="alert error">{error}</div>}
    <div className="detail-grid">
      <div className="detail-main">
        <section className="panel case-panel"><div className="panel-heading"><span>Relato</span><h2>Detalhes da ocorrência</h2></div><p className="description">{item.description}</p><dl className="metadata"><div><dt>Categoria</dt><dd>{item.category}</dd></div><div><dt>Localização</dt><dd>{item.location}</dd></div><div><dt>Solicitante</dt><dd>{item.requester.name}</dd></div><div><dt>Responsável</dt><dd>{item.assignee?.name ?? 'Ainda não atribuído'}</dd></div></dl>{item.imagePath && <img className="occurrence-image" src={assetUrl(item.imagePath)} alt="Imagem anexada à ocorrência" />}</section>
        <section className="panel case-panel"><div className="panel-heading"><span>Encerramento</span><h2>Solução aplicada</h2></div>{item.appliedSolution ? <p className="solution">{item.appliedSolution}</p> : <p className="muted">A solução ainda não foi registrada.</p>}{manager && <form onSubmit={submitSolution} className="inline-form"><textarea name="solution" defaultValue={item.appliedSolution} minLength={2} rows={3} placeholder="Descreva a solução aplicada" required /><button className="button secondary" disabled={busy === 'solution'}>Salvar solução</button></form>}</section>
        <section className="panel case-panel"><div className="panel-heading"><span>Comunicação</span><h2>Comentários</h2></div><div className="comment-list">{item.comments.length === 0 ? <p className="muted">Nenhum comentário foi adicionado.</p> : item.comments.map(comment => <article key={comment.id}><div><strong>{comment.author.name}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time></div><p>{comment.text}</p></article>)}</div><form onSubmit={submitComment} className="inline-form"><textarea name="text" maxLength={2000} rows={3} placeholder="Escreva uma atualização para esta ocorrência" required /><button className="button secondary" disabled={busy === 'comment'}>Adicionar comentário</button></form></section>
        <section className="panel case-panel"><div className="panel-heading"><span>Rastreabilidade</span><h2>Histórico de status</h2></div>{item.history.length === 0 ? <p className="muted">A ocorrência ainda não mudou de status.</p> : <ol className="timeline">{item.history.map(entry => <li key={entry.id}><i /><div><strong>{formatStatus(entry.previousStatus)} → {formatStatus(entry.newStatus)}</strong><p>{entry.observation}</p><small><time dateTime={entry.changedAt}>{formatDate(entry.changedAt)}</time><span>{entry.changedBy.name}</span></small></div></li>)}</ol>}</section>
      </div>
      <aside className="detail-sidebar">
        <section className={`progress-ledger ${item.status === 'Cancelada' ? 'is-cancelled' : ''}`} aria-label="Andamento da ocorrência">
          <div><span>Andamento</span><strong>{formatStatus(item.status)}</strong></div>
          <ol>{progressStages.map((stage, index) => <li className={index < progressIndex ? 'done' : index === progressIndex ? 'current' : ''} key={stage}><i /><span>{formatStatus(stage)}</span></li>)}</ol>
          {item.status === 'Cancelada' && <p>Fluxo encerrado por cancelamento.</p>}
        </section>
        {manager && <section className="panel sticky control-desk"><p className="context-label">Mesa do Gestor</p><h2>Conduzir atendimento</h2>
          <label>Prioridade<select value={item.priority} onChange={event => void action('priority', `/api/occurrences/${id}/priority`, 'PATCH', { priority: event.target.value as Priority })}><option value="Baixa">Baixa</option><option value="Media">Média</option><option value="Alta">Alta</option><option value="Critica">Crítica</option></select></label>
          <label>Responsável<select value={item.assignee?.id ?? ''} onChange={event => void action('assignee', `/api/occurrences/${id}/assignee`, 'PATCH', { assigneeId: event.target.value || null })}><option value="">Sem responsável</option>{managers.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
          {item.allowedNextStatuses.length > 0 ? <form key={item.status} className="status-form" onSubmit={submitStatus}><label>Próxima ação<select name="status" required defaultValue=""><option value="" disabled>Selecione</option>{item.allowedNextStatuses.map(status => <option value={status} key={status}>{formatTransitionAction(item.status, status)} — {formatStatus(status)}</option>)}</select></label><label>Observação<textarea name="observation" minLength={2} maxLength={500} rows={3} placeholder="Motivo e contexto da alteração" required /></label><button className="button primary" disabled={busy === 'status'}>Registrar alteração</button></form> : <div className="terminal-state">Estado final: não há novas transições.</div>}
        </section>}
        {!manager && item.status === 'Resolvida' && <section className="panel evaluation-panel"><p className="context-label">Depois da resolução</p><h2>Avalie o atendimento</h2>{item.evaluation ? <div className="evaluation"><strong>{'★'.repeat(item.evaluation.score)}{'☆'.repeat(5 - item.evaluation.score)}</strong><p>{item.evaluation.comment || 'Sem comentário.'}</p><small>{formatDate(item.evaluation.createdAt)}</small></div> : <form className="stack-form" onSubmit={submitEvaluation}><label>Nota<select name="score" defaultValue="5"><option value="5">5 - Excelente</option><option value="4">4 - Boa</option><option value="3">3 - Regular</option><option value="2">2 - Ruim</option><option value="1">1 - Péssima</option></select></label><label>Comentário<textarea name="comment" rows={3} maxLength={1000} /></label><button className="button primary" disabled={busy === 'evaluation'}>Enviar avaliação</button></form>}</section>}
        <section className="panel summary-card"><h2>Resumo</h2><dl><div><dt>Status</dt><dd>{formatStatus(item.status)}</dd></div><div><dt>Prioridade</dt><dd>{formatPriority(item.priority)}</dd></div><div><dt>Última atualização</dt><dd>{formatDate(item.updatedAt)}</dd></div></dl></section>
      </aside>
    </div>
  </>
}
