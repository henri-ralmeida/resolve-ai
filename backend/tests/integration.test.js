const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const { createApp } = require('../src/app');
const { seedManager } = require('../src/modules/auth/auth.service');

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.includes('_test')) {
  throw new Error('TEST_DATABASE_URL deve apontar para um banco separado com _test no nome.');
}
process.env.DATABASE_URL = databaseUrl;

const db = new PrismaClient();
const unique = Date.now().toString(36);
const config = {
  jwtKey: 'integration-test-key-at-least-thirty-two-characters',
  jwtIssuer: 'ResolveAi',
  jwtAudience: 'ResolveAi.Client',
  jwtExpiresIn: '8h',
  corsOrigin: 'http://localhost:5173',
  adminName: 'Gestor Teste',
  adminEmail: `manager-${unique}@test.local`,
  adminPassword: 'Manager123!',
  frontendDistPath: path.join(os.tmpdir(), `resolveai-frontend-${unique}`),
};
let app;
let managerToken;
let requesterToken;
let otherToken;
const createdUserIds = [];

const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  config.uploadsPath = await fs.mkdtemp(path.join(os.tmpdir(), 'resolveai-uploads-'));
  await db.$connect();
  await seedManager(db, config);
  app = createApp({ db, config });
  const manager = await request(app).post('/api/auth/login').send({ email: config.adminEmail, password: config.adminPassword });
  expect(manager.status).toBe(200);
  managerToken = manager.body.token;
  createdUserIds.push(manager.body.user.id);
});

afterAll(async () => {
  if (createdUserIds.length) {
    await db.occurrence.deleteMany({ where: { requesterId: { in: createdUserIds } } });
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await db.$disconnect();
  if (config.uploadsPath) await fs.rm(config.uploadsPath, { recursive: true, force: true });
});

test('fluxo integrado preserva perfis, histórico, comentários, filtros, imagem, solução e avaliação', async () => {
  const signup = async (name, requestedRole) => request(app).post('/api/auth/register').send({
    name,
    email: `${name.toLowerCase()}-${unique}@test.local`,
    password: 'Requester123!',
    ...(requestedRole ? { role: requestedRole } : {}),
  });
  const requester = await signup('Henrique', 'Gestor');
  const other = await signup('Outra');
  expect(requester.status).toBe(200);
  expect(requester.body.user.role).toBe('Solicitante');
  requesterToken = requester.body.token;
  otherToken = other.body.token;
  createdUserIds.push(requester.body.user.id, other.body.user.id);

  expect((await request(app).get('/api/dashboard').set(auth(requesterToken))).status).toBe(403);
  expect((await request(app).get('/api/users/managers').set(auth(requesterToken))).status).toBe(403);
  expect((await request(app).post('/api/occurrences').set(auth(managerToken)).field('Title', 'Invalida')).status).toBe(403);

  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082', 'hex');
  const directResolved = await request(app).post('/api/occurrences').set(auth(requesterToken))
    .field('Title', 'Tentativa de pular etapas').field('Description', 'Um solicitante não pode escolher o status inicial.')
    .field('Category', 'Teste').field('Location', 'Bloco A').field('Status', 'Resolvida');
  expect(directResolved.status).toBe(400);
  const created = await request(app).post('/api/occurrences').set(auth(requesterToken))
    .field('Title', 'Lâmpada apagada').field('Description', 'Corredor principal sem luz')
    .field('Category', 'Iluminação').field('Location', 'Bloco A')
    .attach('Image', png, { filename: 'lampada.png', contentType: 'image/png' });
  expect(created.status).toBe(201);
  expect(created.body.status).toBe('Aberta');
  expect(created.body.imagePath).toMatch(/^\/uploads\/.+\.png$/);
  const id = created.body.id;
  expect((await request(app).get(created.body.imagePath)).status).toBe(200);

  expect((await request(app).get(`/api/occurrences/${id}`).set(auth(otherToken))).status).toBe(404);
  expect((await request(app).get(`/api/occurrences/${id}/history`).set(auth(otherToken))).status).toBe(404);
  expect((await request(app).post(`/api/occurrences/${id}/comments`).set(auth(otherToken)).send({ text: 'Não deveria entrar' })).status).toBe(404);
  expect((await request(app).patch(`/api/occurrences/${id}/status`).set(auth(requesterToken)).send({ status: 'EmAnalise', observation: 'Teste' })).status).toBe(403);
  expect((await request(app).get('/api/occurrences').set(auth(otherToken))).body).toHaveLength(0);

  const otherOccurrence = await request(app).post('/api/occurrences').set(auth(otherToken))
    .field('Title', 'Portão sem acesso').field('Description', 'O portão da entrada não abre corretamente.')
    .field('Category', 'Acesso').field('Location', 'Entrada principal');
  expect(otherOccurrence.status).toBe(201);
  const requesterItems = await request(app).get('/api/occurrences').set(auth(requesterToken));
  const otherItems = await request(app).get('/api/occurrences').set(auth(otherToken));
  const managerItems = await request(app).get('/api/occurrences').set(auth(managerToken));
  expect(requesterItems.body.map((item) => item.id)).toEqual([id]);
  expect(otherItems.body.map((item) => item.id)).toEqual([otherOccurrence.body.id]);
  expect(managerItems.body.map((item) => item.id).sort()).toEqual([id, otherOccurrence.body.id].sort());
  expect((await request(app).get(`/api/occurrences/${id}`).set(auth(managerToken))).status).toBe(200);

  expect((await request(app).patch(`/api/occurrences/${id}/priority`).set(auth(requesterToken)).send({ priority: 'Alta' })).status).toBe(403);
  expect((await request(app).patch(`/api/occurrences/${id}/assignee`).set(auth(requesterToken)).send({ assigneeId: requester.body.user.id })).status).toBe(403);
  expect((await request(app).patch(`/api/occurrences/${id}/solution`).set(auth(requesterToken)).send({ solution: 'Não autorizado' })).status).toBe(403);
  expect((await request(app).post(`/api/occurrences/${id}/evaluation`).set(auth(managerToken)).send({ score: 5 })).status).toBe(403);
  expect((await request(app).post(`/api/occurrences/${id}/evaluation`).set(auth(requesterToken)).send({ score: 5 })).status).toBe(409);
  const unchanged = await request(app).get(`/api/occurrences/${id}`).set(auth(requesterToken));
  expect(unchanged.body).toMatchObject({ status: 'Aberta', priority: 'Media', assignee: null, appliedSolution: null });

  const comment = await request(app).post(`/api/occurrences/${id}/comments`).set(auth(requesterToken)).send({ text: 'Aguardando atendimento' });
  expect(comment.status).toBe(200);
  expect(comment.body.author.name).toBe('Henrique');
  const managerComment = await request(app).post(`/api/occurrences/${id}/comments`).set(auth(managerToken)).send({ text: 'Solicitação recebida pela equipe.' });
  expect(managerComment.status).toBe(200);
  expect(managerComment.body.author.name).toBe('Gestor Teste');
  expect((await request(app).patch(`/api/occurrences/${id}/priority`).set(auth(managerToken)).send({ priority: 'Alta' })).status).toBe(204);
  const managers = await request(app).get('/api/users/managers').set(auth(managerToken));
  expect(managers.status).toBe(200);
  expect((await request(app).patch(`/api/occurrences/${id}/assignee`).set(auth(managerToken)).send({ assigneeId: managers.body[0].id })).status).toBe(204);
  expect((await request(app).patch(`/api/occurrences/${id}/assignee`).set(auth(managerToken)).send({ assigneeId: requester.body.user.id })).status).toBe(400);

  const transition = async (status, observation) => request(app).patch(`/api/occurrences/${id}/status`)
    .set(auth(managerToken)).send({ status, observation });
  expect((await transition('Resolvida', 'Pular etapas')).status).toBe(409);
  expect((await transition('EmAnalise', '  ')).status).toBe(400);
  expect((await request(app).get(`/api/occurrences/${id}/history`).set(auth(requesterToken))).body).toHaveLength(0);
  for (const [status, observation] of [
    ['EmAnalise', 'Triagem iniciada'],
    ['EmAtendimento', 'Equipe no local'],
    ['Resolvida', 'Lâmpada substituída'],
  ]) expect((await transition(status, observation)).status).toBe(204);
  expect((await transition('Cancelada', 'Tentar reabrir')).status).toBe(409);
  expect((await request(app).patch(`/api/occurrences/${id}/solution`).set(auth(managerToken)).send({ solution: 'Lâmpada substituída' })).status).toBe(204);

  const history = await request(app).get(`/api/occurrences/${id}/history`).set(auth(requesterToken));
  expect(history.status).toBe(200);
  expect(history.body.map((entry) => [entry.previousStatus, entry.newStatus])).toEqual([
    ['Aberta', 'EmAnalise'], ['EmAnalise', 'EmAtendimento'], ['EmAtendimento', 'Resolvida'],
  ]);
  expect(history.body.every((entry) => entry.changedBy.name === 'Gestor Teste' && entry.changedAt && entry.observation)).toBe(true);

  const evaluated = await request(app).post(`/api/occurrences/${id}/evaluation`).set(auth(requesterToken)).send({ score: 5, comment: 'Ótimo atendimento' });
  expect(evaluated.status).toBe(204);
  expect((await request(app).post(`/api/occurrences/${id}/evaluation`).set(auth(requesterToken)).send({ score: 1 })).status).toBe(409);
  expect((await request(app).post(`/api/occurrences/${id}/evaluation`).set(auth(otherToken)).send({ score: 1 })).status).toBe(404);

  const detail = await request(app).get(`/api/occurrences/${id}`).set(auth(requesterToken));
  expect(detail.body.comments).toHaveLength(2);
  expect(detail.body.evaluation.score).toBe(5);
  expect(detail.body.appliedSolution).toBe('Lâmpada substituída');
  expect(detail.body.allowedNextStatuses).toEqual([]);
  expect((await request(app).get('/api/occurrences?status=Resolvida&priority=Alta&category=ilumina').set(auth(managerToken))).body).toHaveLength(1);
  const dashboard = await request(app).get('/api/dashboard').set(auth(managerToken));
  expect(dashboard.body.total).toBe(2);
  expect(dashboard.body.byStatus).toContainEqual({ label: 'Resolvida', count: 1 });
  expect(dashboard.body.byStatus).toContainEqual({ label: 'Aberta', count: 1 });

  expect((await request(app).get('/api/occurrences')).status).toBe(401);
  expect((await request(app).post('/api/occurrences').set(auth(requesterToken))
    .field('Title', 'Teste imagem').field('Description', 'Descrição válida')
    .field('Category', 'Outro').field('Location', 'Bloco B')
    .attach('Image', Buffer.from('not a png'), { filename: 'bad.png', contentType: 'image/png' })).status).toBe(400);
  expect((await request(app).post('/api/occurrences').set(auth(requesterToken))
    .field('Title', 'X').field('Description', 'Y').field('Category', 'Z').field('Location', 'A')).status).toBe(400);

  const cancellationPaths = [
    { title: 'Cancelar antes da análise', source: 'Aberta', steps: [], allowed: ['EmAnalise', 'Cancelada'], invalid: ['EmAtendimento', 'Resolvida'] },
    { title: 'Cancelar durante a análise', source: 'EmAnalise', steps: [['EmAnalise', 'Triagem iniciada']], allowed: ['EmAtendimento', 'Cancelada'], invalid: ['Aberta', 'Resolvida'] },
    { title: 'Cancelar durante o atendimento', source: 'EmAtendimento', steps: [['EmAnalise', 'Triagem iniciada'], ['EmAtendimento', 'Atendimento iniciado']], allowed: ['Resolvida', 'Cancelada'], invalid: ['Aberta', 'EmAnalise'] },
  ];

  for (const scenario of cancellationPaths) {
    const occurrence = await request(app).post('/api/occurrences').set(auth(requesterToken))
      .field('Title', scenario.title).field('Description', 'Teste de uma saída de cancelamento.')
      .field('Category', 'Ciclo de vida').field('Location', 'Bloco de teste');
    expect(occurrence.status).toBe(201);
    const occurrenceId = occurrence.body.id;
    const transitionFor = (status, observation) => request(app).patch(`/api/occurrences/${occurrenceId}/status`)
      .set(auth(managerToken)).send({ status, observation });
    const historyFor = () => request(app).get(`/api/occurrences/${occurrenceId}/history`).set(auth(requesterToken));
    const expectedHistory = [];
    let previousStatus = 'Aberta';

    for (const [status, observation] of scenario.steps) {
      expect((await transitionFor(status, observation)).status).toBe(204);
      expectedHistory.push([previousStatus, status]);
      previousStatus = status;
    }

    const active = await request(app).get(`/api/occurrences/${occurrenceId}`).set(auth(requesterToken));
    expect(active.status).toBe(200);
    expect(active.body.status).toBe(scenario.source);
    expect(active.body.allowedNextStatuses).toEqual(scenario.allowed);
    for (const invalidStatus of scenario.invalid) {
      expect((await transitionFor(invalidStatus, 'Transição fora do diagrama')).status).toBe(409);
    }
    expect((await historyFor()).body).toHaveLength(scenario.steps.length);

    const cancellationObservation = 'Ocorrência cancelada pelo Gestor.';
    expect((await transitionFor('Cancelada', cancellationObservation)).status).toBe(204);
    expectedHistory.push([scenario.source, 'Cancelada']);
    const final = await request(app).get(`/api/occurrences/${occurrenceId}`).set(auth(requesterToken));
    expect(final.body.status).toBe('Cancelada');
    expect(final.body.allowedNextStatuses).toEqual([]);

    const history = await historyFor();
    expect(history.status).toBe(200);
    expect(history.body.map((entry) => [entry.previousStatus, entry.newStatus])).toEqual(expectedHistory);
    expect(history.body.every((entry) => entry.changedAt && entry.changedBy.id && entry.changedBy.name === 'Gestor Teste' && entry.observation)).toBe(true);
    expect(history.body.at(-1).observation).toBe(cancellationObservation);
    expect((await transitionFor('EmAnalise', 'Tentativa de reabrir')).status).toBe(409);
    expect((await historyFor()).body).toHaveLength(expectedHistory.length);
  }
});
