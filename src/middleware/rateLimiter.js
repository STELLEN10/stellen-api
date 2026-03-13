const rateLimit = require('express-rate-limit');
const { error }  = require('../utils/response');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');  // 15 min
const max      = parseInt(process.env.RATE_LIMIT_MAX       || '100');
const authMax  = parseInt(process.env.AUTH_RATE_LIMIT_MAX  || '10');

const handler = (req, res) =>
  error(res, 'Too many requests — please slow down.', 429);

/** Global rate limiter — 100 req / 15 min */
const globalLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

/** Strict limiter for auth endpoints — 10 req / 15 min */
const authLimiter = rateLimit({
  windowMs,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skipSuccessfulRequests: false,
});

/** Write limiter — 30 req / 15 min (POST/PUT/PATCH/DELETE) */
const writeLimiter = rateLimit({
  windowMs,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skip: (req) => ['GET','HEAD','OPTIONS'].includes(req.method),
});

module.exports = { globalLimiter, authLimiter, writeLimiter };
