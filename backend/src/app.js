const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const defaultDb = require('./config/prisma');
const { getConfig } = require('./config/env');
const { makeAuth } = require('./http/auth');
const { HttpError, problem } = require('./http/errors');
const { makeAuthRoutes } = require('./modules/auth/auth.routes');
const { makeOccurrenceRoutes } = require('./modules/occurrences/occurrence.routes');
const { makeUserRoutes } = require('./modules/users/user.routes');
const { makeDashboardRoutes } = require('./modules/dashboard/dashboard.routes');
const openapi = require('./openapi');

function createApp({ db = defaultDb, config = getConfig() } = {}) {
  const app = express();
  const requireAuth = makeAuth(db, config);
  const context = { db, config, requireAuth };

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigin.split(',').map((origin) => origin.trim()) }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(config.uploadsPath, { index: false, dotfiles: 'deny' }));

  app.get('/health', async (req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ status: 'healthy', database: 'ready' });
    } catch {
      problem(res, 503, 'Banco de dados indisponível.');
    }
  });
  app.get('/openapi/v1.json', (req, res) => res.json(openapi));
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(openapi));

  app.use('/api/auth', makeAuthRoutes(context));
  app.use('/api/occurrences', makeOccurrenceRoutes(context));
  app.use('/api/users', makeUserRoutes(context));
  app.use('/api/dashboard', makeDashboardRoutes(context));

  const indexPath = path.join(config.frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) app.use(express.static(config.frontendDistPath, { index: false }));
  app.use((req, res) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return problem(res, 404, 'Rota não encontrada.');
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof HttpError) return problem(res, error.status, error.title, error.detail);
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') return problem(res, 400, 'A imagem deve ter no máximo 5 MB.');
      return problem(res, 400, 'Formulário de ocorrência inválido.');
    }
    if (error.type === 'entity.parse.failed') return problem(res, 400, 'JSON inválido.');
    if (error.code === 'P2002') return problem(res, 409, 'Registro duplicado.');
    if (error.code === 'P2025') return problem(res, 404, 'Registro não encontrado.');
    console.error(error);
    return problem(res, 500, 'Erro interno do servidor.');
  });

  return app;
}

module.exports = { createApp };
