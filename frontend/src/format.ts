import type { OccurrenceStatus, Priority } from './types'

const statusLabels: Record<OccurrenceStatus, string> = {
  Aberta: 'Aberta',
  EmAnalise: 'Em análise',
  EmAtendimento: 'Em atendimento',
  Resolvida: 'Resolvida',
  Cancelada: 'Cancelada',
}

const transitionActions: Record<OccurrenceStatus, Partial<Record<OccurrenceStatus, string>>> = {
  Aberta: { EmAnalise: 'Analisar', Cancelada: 'Cancelar' },
  EmAnalise: { EmAtendimento: 'Iniciar atendimento', Cancelada: 'Cancelar' },
  EmAtendimento: { Resolvida: 'Concluir', Cancelada: 'Cancelar' },
  Resolvida: {},
  Cancelada: {},
}

const priorityLabels: Record<Priority, string> = {
  Baixa: 'Baixa',
  Media: 'Média',
  Alta: 'Alta',
  Critica: 'Crítica',
}

export const formatStatus = (status: OccurrenceStatus) => statusLabels[status]
export const formatTransitionAction = (current: OccurrenceStatus, next: OccurrenceStatus) =>
  transitionActions[current][next] ?? formatStatus(next)
export const formatPriority = (priority: Priority) => priorityLabels[priority]
export const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value))
