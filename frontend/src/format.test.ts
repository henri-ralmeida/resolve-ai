import { describe, expect, it } from 'vitest'
import { formatPriority, formatStatus, formatTransitionAction } from './format'

describe('rótulos do domínio', () => {
  it('apresenta os estados e prioridades em português', () => {
    expect(formatStatus('EmAnalise')).toBe('Em análise')
    expect(formatStatus('EmAtendimento')).toBe('Em atendimento')
    expect(formatPriority('Media')).toBe('Média')
    expect(formatPriority('Critica')).toBe('Crítica')
  })

  it('nomeia as ações exatamente como no ciclo de vida da ocorrência', () => {
    expect(formatTransitionAction('Aberta', 'EmAnalise')).toBe('Analisar')
    expect(formatTransitionAction('EmAnalise', 'EmAtendimento')).toBe('Iniciar atendimento')
    expect(formatTransitionAction('EmAtendimento', 'Resolvida')).toBe('Concluir')
    expect(formatTransitionAction('Aberta', 'Cancelada')).toBe('Cancelar')
    expect(formatTransitionAction('EmAnalise', 'Cancelada')).toBe('Cancelar')
    expect(formatTransitionAction('EmAtendimento', 'Cancelada')).toBe('Cancelar')
  })
})
