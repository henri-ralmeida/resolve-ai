const statuses = ['Aberta', 'EmAnalise', 'EmAtendimento', 'Resolvida', 'Cancelada'];
const priorities = ['Baixa', 'Media', 'Alta', 'Critica'];

const allowed = Object.freeze({
  Aberta: ['EmAnalise', 'Cancelada'],
  EmAnalise: ['EmAtendimento', 'Cancelada'],
  EmAtendimento: ['Resolvida', 'Cancelada'],
  Resolvida: [],
  Cancelada: [],
});

function nextStatuses(current) {
  return allowed[current] || [];
}

function canTransition(current, next) {
  return nextStatuses(current).includes(next);
}

module.exports = { statuses, priorities, nextStatuses, canTransition };
