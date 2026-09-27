const jwt = require('jsonwebtoken');
const { problem } = require('./errors');

function makeAuth(db, config) {
  return (roles = []) => async (req, res, next) => {
    const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!match) return problem(res, 401, 'Autenticação necessária.');

    let claims;
    try {
      claims = jwt.verify(match[1], config.jwtKey, {
        algorithms: ['HS256'],
        issuer: config.jwtIssuer,
        audience: config.jwtAudience,
      });
    } catch {
      return problem(res, 401, 'Sessão inválida ou expirada.');
    }

    const user = await db.user.findUnique({ where: { id: claims.sub } });
    if (!user) return problem(res, 401, 'Sessão inválida ou expirada.');
    if (roles.length && !roles.includes(user.role)) {
      return problem(res, 403, 'Acesso não permitido para este perfil.');
    }

    req.user = user;
    return next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return problem(res, 403, 'Acesso não permitido para este perfil.');
    return next();
  };
}

module.exports = { makeAuth, requireRole };
