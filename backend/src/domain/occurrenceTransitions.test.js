const { statuses, nextStatuses, canTransition } = require('./occurrenceTransitions');

const expectedNextStatuses = {
  Aberta: ['EmAnalise', 'Cancelada'],
  EmAnalise: ['EmAtendimento', 'Cancelada'],
  EmAtendimento: ['Resolvida', 'Cancelada'],
  Resolvida: [],
  Cancelada: [],
};

describe('ciclo de vida da ocorrência', () => {
  test('expõe exatamente as próximas etapas do diagrama', () => {
    for (const status of statuses) {
      expect(nextStatuses(status)).toEqual(expectedNextStatuses[status]);
    }
  });

  test('permite somente as setas do diagrama e mantém os dois estados finais', () => {
    for (const current of statuses) {
      for (const next of statuses) {
        expect(canTransition(current, next)).toBe(expectedNextStatuses[current].includes(next));
      }
    }
    expect(nextStatuses('status desconhecido')).toEqual([]);
    expect(canTransition('status desconhecido', 'Aberta')).toBe(false);
  });
});
