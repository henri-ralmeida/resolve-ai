const db = require('./config/prisma');
const { getConfig } = require('./config/env');
const { seedManager } = require('./modules/auth/auth.service');
const { createApp } = require('./app');

async function main() {
  const config = getConfig();
  await db.$connect();
  await seedManager(db, config);

  const server = createApp({ db, config }).listen(config.port, () => {
    console.log(`Resolve Aí disponível na porta ${config.port}.`);
  });

  async function shutdown() {
    await new Promise((resolve) => server.close(resolve));
    await db.$disconnect();
  }
  process.once('SIGINT', () => shutdown().then(() => process.exit(0)));
  process.once('SIGTERM', () => shutdown().then(() => process.exit(0)));
}

main().catch(async (error) => {
  console.error('Falha ao iniciar a API:', error);
  await db.$disconnect();
  process.exitCode = 1;
});
