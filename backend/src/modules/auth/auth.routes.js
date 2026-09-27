const express = require('express');
const { validate } = require('../../http/validate');
const { registerSchema, loginSchema } = require('./auth.validators');
const { makeAuthService } = require('./auth.service');
const { makeAuthController } = require('./auth.controller');

function makeAuthRoutes({ db, config, requireAuth }) {
  const router = express.Router();
  const controller = makeAuthController(makeAuthService(db, config));
  router.post('/register', validate(registerSchema), controller.register);
  router.post('/login', validate(loginSchema), controller.login);
  router.get('/me', requireAuth(), controller.me);
  return router;
}

module.exports = { makeAuthRoutes };
