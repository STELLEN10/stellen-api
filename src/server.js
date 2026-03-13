require('dotenv').config();
const app    = require('./app');
const logger = require('./utils/logger');
const { pool } = require('./config/database');

const PORT = parseInt(process.env.PORT || '3000');

const server = app.listen(PORT, () => {
  logger.info(`🚀  Stellen API running`, {
    port:    PORT,
    env:     process.env.NODE_ENV || 'development',
    docs:    `http://localhost:${PORT}/docs`,
    health:  `http://localhost:${PORT}/api/v1/health`,
  });
});

// ── Graceful shutdown ─────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — graceful shutdown`);
  server.close(async () => {
    logger.info('HTTP server closed');
    await pool.end();
    logger.info('DB pool closed');
    process.exit(0);
  });
  // Force quit after 10 s
  setTimeout(() => { logger.error('Forced shutdown'); process.exit(1); }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled rejections ──────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message });
  process.exit(1);
});

module.exports = server;
