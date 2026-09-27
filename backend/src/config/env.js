const path = require('node:path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '../../..');
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

function getConfig() {
  const jwtKey = process.env.JWT_KEY;
  if (!jwtKey || jwtKey.length < 32) {
    throw new Error('JWT_KEY deve ter pelo menos 32 caracteres.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não foi configurada.');
  }

  return {
    port: Number(process.env.PORT || 5080),
    jwtKey,
    jwtIssuer: 'ResolveAi',
    jwtAudience: 'ResolveAi.Client',
    jwtExpiresIn: '8h',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    uploadsPath: process.env.UPLOADS_PATH || path.join(projectRoot, 'backend', 'uploads'),
    frontendDistPath: path.join(projectRoot, 'frontend', 'dist'),
    adminName: process.env.ADMIN_NAME,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
  };
}

module.exports = { getConfig };
