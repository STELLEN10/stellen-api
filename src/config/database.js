const { Pool } = require('pg');
const logger   = require('../utils/logger');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'stellenapi',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max:               20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => logger.debug('DB: new client connected'));
pool.on('error',   (err) => logger.error('DB pool error', { error: err.message }));

/**
 * Execute a parameterised query.
 * @param {string} text - SQL string
 * @param {any[]}  params - bound parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client (for transactions).
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
