import { describe, expect, it } from 'vitest'
import { formatPriority, formatStatus } from './format'

describe('rótulos do domínio', () => {
  it('apresenta os estados e prioridades em português', () => {
    expect(formatStatus('EmAnalise')).toBe('Em análise')
    expect(formatStatus('EmAtendimento')).toBe('Em atendimento')
    expect(formatPriority('Media')).toBe('Média')
    expect(formatPriority('Critica')).toBe('Crítica')
  })
})
