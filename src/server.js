const app    = require('./app');
const db     = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await db.connect();

  const server = app.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} recebido. Encerrando...`);
    server.close(async () => {
      await db.disconnect();
      logger.info('Servidor encerrado.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`UnhandledRejection: ${reason}`);
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`UncaughtException: ${err.message}`);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error(`Erro ao iniciar: ${err.message}`);
  process.exit(1);
});
