const express = require('express');
const { z } = require('zod');
const { problem } = require('../../http/errors');
const { validate } = require('../../http/validate');
const { requireRole } = require('../../http/auth');
const { upload } = require('../../infrastructure/images');
const { makeOccurrenceService } = require('./occurrence.service');
const { makeOccurrenceController } = require('./occurrence.controller');
const {
  createSchema, filterSchema, commentSchema, prioritySchema, assigneeSchema,
  statusSchema, solutionSchema, evaluationSchema,
} = require('./occurrence.validators');

function validId(req, res, next) {
  if (!z.uuid().safeParse(req.params.id).success) return problem(res, 404, 'Ocorrência não encontrada.');
  return next();
}

function normalizeForm(req, res, next) {
  req.body = Object.fromEntries(Object.entries(req.body).map(([key, value]) => [
    key.charAt(0).toLowerCase() + key.slice(1), value,
  ]));
  next();
}

function makeOccurrenceRoutes({ db, config, requireAuth }) {
  const router = express.Router();
  const controller = makeOccurrenceController(makeOccurrenceService(db, config));
  router.use(requireAuth());

  router.post('/', requireRole('Solicitante'), upload, normalizeForm, validate(createSchema), controller.create);
  router.get('/', validate(filterSchema, 'query'), controller.list);
  router.get('/:id', validId, controller.detail);
  router.get('/:id/history', validId, controller.history);
  router.post('/:id/comments', validId, validate(commentSchema), controller.addComment);
  router.patch('/:id/priority', requireRole('Gestor'), validId, validate(prioritySchema), controller.changePriority);
  router.patch('/:id/assignee', requireRole('Gestor'), validId, validate(assigneeSchema), controller.assign);
  router.patch('/:id/status', requireRole('Gestor'), validId, validate(statusSchema), controller.changeStatus);
  router.patch('/:id/solution', requireRole('Gestor'), validId, validate(solutionSchema), controller.setSolution);
  router.post('/:id/evaluation', requireRole('Solicitante'), validId, validate(evaluationSchema), controller.evaluate);
  return router;
}

module.exports = { makeOccurrenceRoutes };
