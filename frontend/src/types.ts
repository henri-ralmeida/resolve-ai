export type UserRole = 'Solicitante' | 'Gestor'
export type OccurrenceStatus = 'Aberta' | 'EmAnalise' | 'EmAtendimento' | 'Resolvida' | 'Cancelada'
export type Priority = 'Baixa' | 'Media' | 'Alta' | 'Critica'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Person {
  id: string
  name: string
}

export interface Comment {
  id: string
  author: Person
  text: string
  createdAt: string
}

export interface HistoryEntry {
  id: string
  previousStatus: OccurrenceStatus
  newStatus: OccurrenceStatus
  changedAt: string
  changedBy: Person
  observation: string
}

export interface Evaluation {
  score: number
  comment?: string
  createdAt: string
}

export interface OccurrenceListItem {
  id: string
  title: string
  category: string
  location: string
  priority: Priority
  status: OccurrenceStatus
  requester: Person
  assignee?: Person
  createdAt: string
  updatedAt: string
}

export interface OccurrenceDetail extends OccurrenceListItem {
  description: string
  imagePath?: string
  appliedSolution?: string
  comments: Comment[]
  history: HistoryEntry[]
  evaluation?: Evaluation
  allowedNextStatuses: OccurrenceStatus[]
}

export interface Indicator {
  label: string
  count: number
}

export interface DashboardData {
  total: number
  byStatus: Indicator[]
  byPriority: Indicator[]
  byCategory: Indicator[]
}
