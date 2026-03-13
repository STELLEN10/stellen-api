const { verifyAccess } = require('../utils/jwt');
const { query }        = require('../config/database');
const { unauthorised, forbidden } = require('../utils/response');
const logger           = require('../utils/logger');

/**
 * protect — verifies JWT and attaches user to req.
 */
const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return unauthorised(res, 'No token provided');

  const token = header.split(' ')[1];
  try {
    const decoded = verifyAccess(token);
    const { rows } = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (!rows.length)        return unauthorised(res, 'User not found');
    if (!rows[0].is_active)  return unauthorised(res, 'Account disabled');
    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return unauthorised(res, 'Token expired');
    if (err.name === 'JsonWebTokenError') return unauthorised(res, 'Invalid token');
    logger.error('protect middleware error', { error: err.message });
    return unauthorised(res);
  }
};

/**
 * roles(...allowed) — role-based access guard.
 * Must be used after `protect`.
 */
const roles = (...allowed) => (req, res, next) => {
  if (!req.user) return unauthorised(res);
  if (!allowed.includes(req.user.role))
    return forbidden(res, `Requires role: ${allowed.join(' or ')}`);
  next();
};

/**
 * optionalAuth — attaches user if token present, but doesn't reject if missing.
 */
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  const token = header.split(' ')[1];
  try {
    const decoded = verifyAccess(token);
    const { rows } = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    if (rows.length && rows[0].is_active) req.user = rows[0];
  } catch { /* ignore */ }
  next();
};

module.exports = { protect, roles, optionalAuth };
