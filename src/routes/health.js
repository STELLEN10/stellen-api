const router    = require('express').Router();
const { query } = require('../config/database');
const logger    = require('../utils/logger');

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: API health check
 *     description: Returns API status, uptime, version, and database connectivity.
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:   { type: boolean, example: true }
 *                 status:    { type: string,  example: ok }
 *                 uptime:    { type: number,  description: Process uptime in seconds }
 *                 timestamp: { type: string,  format: date-time }
 *                 version:   { type: string,  example: 1.0.0 }
 *                 database:  { type: string,  example: connected }
 *       503:
 *         description: API or database is unhealthy
 */
router.get('/', async (req, res) => {
  let dbStatus = 'connected';
  let dbLatency = null;

  try {
    const start = Date.now();
    await query('SELECT 1');
    dbLatency = Date.now() - start;
  } catch (err) {
    dbStatus = 'disconnected';
    logger.warn('Health check — DB unreachable', { error: err.message });
  }

  const healthy = dbStatus === 'connected';
  return res.status(healthy ? 200 : 503).json({
    success:    healthy,
    status:     healthy ? 'ok' : 'degraded',
    uptime:     Math.floor(process.uptime()),
    timestamp:  new Date().toISOString(),
    version:    process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database:   { status: dbStatus, latencyMs: dbLatency },
    memory: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rss:        Math.round(process.memoryUsage().rss       / 1024 / 1024),
    },
  });
});

module.exports = router;
