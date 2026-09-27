const { nextStatuses } = require('../../domain/occurrenceTransitions');

const personSelect = { id: true, name: true };
const listInclude = {
  requester: { select: personSelect },
  assignee: { select: personSelect },
};
const detailInclude = {
  ...listInclude,
  comments: { orderBy: { createdAt: 'asc' }, include: { author: { select: personSelect } } },
  history: { orderBy: { changedAt: 'asc' }, include: { changedBy: { select: personSelect } } },
  evaluation: true,
};

function toListItem(item) {
  return {
    id: item.id,
    title: item.title,
    category: item.category,
    location: item.location,
    priority: item.priority,
    status: item.status,
    requester: item.requester,
    assignee: item.assignee,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toDetail(item) {
  return {
    ...toListItem(item),
    description: item.description,
    imagePath: item.imagePath,
    appliedSolution: item.appliedSolution,
    comments: item.comments.map((comment) => ({
      id: comment.id,
      author: comment.author,
      text: comment.text,
      createdAt: comment.createdAt,
    })),
    history: item.history.map((entry) => ({
      id: entry.id,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      changedAt: entry.changedAt,
      changedBy: entry.changedBy,
      observation: entry.observation,
    })),
    evaluation: item.evaluation && {
      score: item.evaluation.score,
      comment: item.evaluation.comment,
      createdAt: item.evaluation.createdAt,
    },
    allowedNextStatuses: nextStatuses(item.status),
  };
}

module.exports = { personSelect, listInclude, detailInclude, toListItem, toDetail };
