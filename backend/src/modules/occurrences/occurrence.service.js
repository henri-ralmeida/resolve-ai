const { HttpError } = require('../../http/errors');
const { canTransition } = require('../../domain/occurrenceTransitions');
const { saveImage, removeImage } = require('../../infrastructure/images');
const { personSelect, listInclude, detailInclude, toListItem, toDetail } = require('./occurrence.mappings');

function makeOccurrenceService(db, config) {
  const visibleWhere = (id, user) => user.role === 'Gestor' ? { id } : { id, requesterId: user.id };

  async function findVisible(id, user) {
    const item = await db.occurrence.findFirst({ where: visibleWhere(id, user), include: detailInclude });
    if (!item) throw new HttpError(404, 'Ocorrência não encontrada.');
    return item;
  }

  async function requireManagerItem(id) {
    const item = await db.occurrence.findUnique({ where: { id } });
    if (!item) throw new HttpError(404, 'Ocorrência não encontrada.');
    return item;
  }

  return {
    async create(input, file, user) {
      const imagePath = await saveImage(file, config.uploadsPath);
      try {
        const item = await db.occurrence.create({
          data: { ...input, requesterId: user.id, imagePath },
          include: detailInclude,
        });
        return toDetail(item);
      } catch (error) {
        await removeImage(imagePath, config.uploadsPath);
        throw error;
      }
    },

    async list(filters, user) {
      const where = user.role === 'Gestor' ? {} : { requesterId: user.id };
      if (filters.category) where.category = { contains: filters.category, mode: 'insensitive' };
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      const items = await db.occurrence.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: 'desc' },
        take: 500,
      });
      return items.map(toListItem);
    },

    async detail(id, user) {
      return toDetail(await findVisible(id, user));
    },

    async history(id, user) {
      return toDetail(await findVisible(id, user)).history;
    },

    async addComment(id, input, user) {
      const visible = await db.occurrence.findFirst({ where: visibleWhere(id, user), select: { id: true } });
      if (!visible) throw new HttpError(404, 'Ocorrência não encontrada.');
      const comment = await db.$transaction(async (tx) => {
        const created = await tx.comment.create({
          data: { occurrenceId: id, authorId: user.id, text: input.text },
          include: { author: { select: personSelect } },
        });
        await tx.occurrence.update({ where: { id }, data: { updatedAt: new Date() } });
        return created;
      });
      return { id: comment.id, author: comment.author, text: comment.text, createdAt: comment.createdAt };
    },

    async changePriority(id, input) {
      await requireManagerItem(id);
      await db.occurrence.update({ where: { id }, data: { priority: input.priority } });
    },

    async assign(id, input) {
      await requireManagerItem(id);
      if (input.assigneeId) {
        const manager = await db.user.findFirst({ where: { id: input.assigneeId, role: 'Gestor' }, select: { id: true } });
        if (!manager) throw new HttpError(400, 'O responsável deve ser um Gestor válido.');
      }
      await db.occurrence.update({ where: { id }, data: { assigneeId: input.assigneeId } });
    },

    async changeStatus(id, input, user) {
      await db.$transaction(async (tx) => {
        const item = await tx.occurrence.findUnique({ where: { id }, select: { status: true } });
        if (!item) throw new HttpError(404, 'Ocorrência não encontrada.');
        if (!canTransition(item.status, input.status)) {
          throw new HttpError(409, 'Transição de status inválida.', `Não é permitido alterar de ${item.status} para ${input.status}.`);
        }

        const changedAt = new Date();
        const changed = await tx.occurrence.updateMany({
          where: { id, status: item.status },
          data: { status: input.status, updatedAt: changedAt },
        });
        if (changed.count !== 1) throw new HttpError(409, 'A ocorrência foi alterada por outro Gestor.');
        await tx.statusHistory.create({
          data: {
            occurrenceId: id,
            previousStatus: item.status,
            newStatus: input.status,
            changedAt,
            changedById: user.id,
            observation: input.observation,
          },
        });
      });
    },

    async setSolution(id, input) {
      await requireManagerItem(id);
      await db.occurrence.update({ where: { id }, data: { appliedSolution: input.solution } });
    },

    async evaluate(id, input, user) {
      const item = await db.occurrence.findFirst({
        where: { id, requesterId: user.id },
        include: { evaluation: { select: { id: true } } },
      });
      if (!item) throw new HttpError(404, 'Ocorrência não encontrada.');
      if (item.status !== 'Resolvida') throw new HttpError(409, 'Apenas ocorrências resolvidas podem ser avaliadas.');
      if (item.evaluation) throw new HttpError(409, 'Esta ocorrência já foi avaliada.');
      try {
        await db.$transaction(async (tx) => {
          await tx.evaluation.create({
            data: {
              occurrenceId: id,
              requesterId: user.id,
              score: input.score,
              comment: input.comment || null,
            },
          });
          await tx.occurrence.update({ where: { id }, data: { updatedAt: new Date() } });
        });
      } catch (error) {
        if (error.code === 'P2002') throw new HttpError(409, 'Esta ocorrência já foi avaliada.');
        throw error;
      }
    },
  };
}

module.exports = { makeOccurrenceService };
