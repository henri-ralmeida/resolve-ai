import { useEffect, useState } from 'react'
import { api } from '../api'
import { formatPriority, formatStatus } from '../format'
import type { DashboardData, OccurrenceStatus, Priority } from '../types'

const activeStages: { key: OccurrenceStatus; label: string }[] = [
  { key: 'Aberta', label: 'Aberta' },
  { key: 'EmAnalise', label: 'Em análise' },
  { key: 'EmAtendimento', label: 'Em atendimento' },
  { key: 'Resolvida', label: 'Resolvida' },
]

function IndicatorGroup({ title, items, label }: { title: string; items: { label: string; count: number }[]; label?: (value: string) => string }) {
  const max = Math.max(...items.map(item => item.count), 1)
  return <section className="ledger-panel">
    <h2>{title}</h2>
    {items.length === 0 ? <p className="muted">Os primeiros registros aparecerão aqui.</p> : <div className="ledger-rows">{items.map(item => <div className="ledger-row" key={item.label}>
      <div><span>{label ? label(item.label) : item.label}</span><strong>{item.count}</strong></div>
      <i><b style={{ width: `${Math.max((item.count / max) * 100, 4)}%` }} /></i>
    </div>)}</div>}
  </section>
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>()
  const [error, setError] = useState('')
  useEffect(() => { api<DashboardData>('/api/dashboard').then(setData).catch(cause => setError(cause instanceof Error ? cause.message : 'Falha ao carregar.')) }, [])

  const countFor = (status: OccurrenceStatus) => data?.byStatus.find(item => item.label === status)?.count ?? 0
  return <>
    <div className="page-heading dashboard-heading">
      <div><p className="context-label">Mesa de operações</p><h1>Visão do atendimento</h1><p>Enxergue onde o trabalho está concentrado antes de decidir o próximo passo.</p></div>
      {data && <div className="dispatch-total"><strong>{data.total}</strong><span>{data.total === 1 ? 'ocorrência registrada' : 'ocorrências registradas'}</span></div>}
    </div>
    {error && <div className="alert error">{error}</div>}
    {!data ? <div className="loading">Organizando os indicadores…</div> : <>
      <section className="status-board">
        <header><div><p className="context-label">Fluxo principal</p><h2>Onde estão as ocorrências agora</h2></div><p>Da abertura à resolução, cada coluna representa uma etapa operacional.</p></header>
        <div className="status-route">{activeStages.map((stage, index) => <div className={`route-stage route-${stage.key.toLowerCase()}`} key={stage.key}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div className="route-node"><strong>{countFor(stage.key)}</strong>{index < activeStages.length - 1 && <i aria-hidden="true" />}</div>
          <small>{stage.label}</small>
        </div>)}</div>
        <div className="cancelled-lane"><span>Fora do fluxo</span><strong>{countFor('Cancelada')}</strong><small>{formatStatus('Cancelada')}</small></div>
      </section>
      <div className="dashboard-secondary">
        <IndicatorGroup title="Pressão por prioridade" items={data.byPriority} label={value => formatPriority(value as Priority)} />
        <IndicatorGroup title="Demanda por categoria" items={data.byCategory} />
      </div>
    </>}
  </>
}
