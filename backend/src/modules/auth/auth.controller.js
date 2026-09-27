const { publicUser } = require('./auth.service');

function makeAuthController(service) {
  return {
    async register(req, res) {
      res.json(await service.register(req.validated));
    },
    async login(req, res) {
      res.json(await service.login(req.validated));
    },
    me(req, res) {
      res.json(publicUser(req.user));
    },
  };
}

module.exports = { makeAuthController };
