const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { HttpError } = require('../../http/errors');

const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8i.pR8QsjJDoJ3AZbLXvHVWs0RGNv6';

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function makeAuthService(db, config) {
  function response(user) {
    const token = jwt.sign({ role: user.role }, config.jwtKey, {
      algorithm: 'HS256',
      expiresIn: config.jwtExpiresIn,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      subject: user.id,
    });
    return { token, user: publicUser(user) };
  }

  return {
    async register(input) {
      const email = input.email.trim().toLowerCase();
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) throw new HttpError(409, 'E-mail já cadastrado.');

      const passwordHash = await bcrypt.hash(input.password, 10);
      try {
        const user = await db.user.create({
          data: { name: input.name.trim(), email, passwordHash, role: 'Solicitante' },
        });
        return response(user);
      } catch (error) {
        if (error.code === 'P2002') throw new HttpError(409, 'E-mail já cadastrado.');
        throw error;
      }
    },

    async login(input) {
      const user = await db.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
      const valid = await bcrypt.compare(input.password, user?.passwordHash || DUMMY_HASH);
      if (!user || !valid) throw new HttpError(401, 'E-mail ou senha inválidos.');
      return response(user);
    },
  };
}

async function seedManager(db, config) {
  if (!config.adminEmail || !config.adminPassword) {
    console.warn('Gestor inicial não configurado. Defina ADMIN_EMAIL e ADMIN_PASSWORD.');
    return;
  }

  const email = config.adminEmail.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'Gestor') throw new Error('O e-mail do Gestor inicial pertence a um Solicitante.');
    return;
  }

  const passwordHash = await bcrypt.hash(config.adminPassword, 10);
  await db.user.create({
    data: {
      name: (config.adminName || 'Gestor Resolve Aí').trim(),
      email,
      passwordHash,
      role: 'Gestor',
    },
  });
}

module.exports = { makeAuthService, seedManager, publicUser };
