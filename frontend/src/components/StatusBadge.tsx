import { formatPriority, formatStatus } from '../format'
import type { OccurrenceStatus, Priority } from '../types'

export function StatusBadge({ status }: { status: OccurrenceStatus }) {
  return <span className={`badge status-${status.toLowerCase()}`}>{formatStatus(status)}</span>
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`badge priority-${priority.toLowerCase()}`}>{formatPriority(priority)}</span>
}
