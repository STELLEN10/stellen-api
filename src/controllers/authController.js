const bcrypt   = require('bcryptjs');
const { query } = require('../config/database');
const jwtUtil  = require('../utils/jwt');
const res_     = require('../utils/response');
const logger   = require('../utils/logger');

// ── Register ─────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length)
      return res_.badRequest(res, 'Email already registered');

    const hash = await bcrypt.hash(password, 12);
    const { rows: [user] } = await query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, is_active, created_at`,
      [name, email, hash]
    );

    const accessToken  = jwtUtil.signAccess({ id: user.id, role: user.role });
    const refreshToken = jwtUtil.signRefresh({ id: user.id });

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, jwtUtil.refreshExpiry()]
    );

    logger.info('User registered', { userId: user.id, email: user.email });
    return res_.created(res, { accessToken, refreshToken, user }, 'Registration successful');
  } catch (err) { next(err); }
};

// ── Login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT id, name, email, password, role, is_active FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user) return res_.unauthorised(res, 'Invalid credentials');
    if (!user.is_active) return res_.unauthorised(res, 'Account disabled');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res_.unauthorised(res, 'Invalid credentials');

    const accessToken  = jwtUtil.signAccess({ id: user.id, role: user.role });
    const refreshToken = jwtUtil.signRefresh({ id: user.id });

    // Store refresh token (rotate on each login)
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, jwtUtil.refreshExpiry()]
    );

    const { password: _, ...safeUser } = user;
    logger.info('User logged in', { userId: user.id });
    return res_.ok(res, { accessToken, refreshToken, user: safeUser }, 'Login successful');
  } catch (err) { next(err); }
};

// ── Refresh Token ─────────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let decoded;
    try { decoded = jwtUtil.verifyRefresh(refreshToken); }
    catch { return res_.unauthorised(res, 'Invalid or expired refresh token'); }

    const { rows } = await query(
      `SELECT rt.*, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.user_id = $2 AND rt.expires_at > NOW()`,
      [refreshToken, decoded.id]
    );
    if (!rows.length) return res_.unauthorised(res, 'Refresh token revoked or expired');
    if (!rows[0].is_active) return res_.unauthorised(res, 'Account disabled');

    // Token rotation
    const newAccess  = jwtUtil.signAccess({ id: decoded.id, role: rows[0].role });
    const newRefresh = jwtUtil.signRefresh({ id: decoded.id });

    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [decoded.id, newRefresh, jwtUtil.refreshExpiry()]
    );

    return res_.ok(res, { accessToken: newAccess, refreshToken: newRefresh }, 'Token refreshed');
  } catch (err) { next(err); }
};

// ── Logout ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    logger.info('User logged out', { userId: req.user?.id });
    return res_.ok(res, {}, 'Logged out successfully');
  } catch (err) { next(err); }
};

// ── Me ────────────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const { rows: [user] } = await query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [req.user.id]
    );
    return res_.ok(res, { user });
  } catch (err) { next(err); }
};

// ── Change Password ───────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows: [user] } = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res_.badRequest(res, 'Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hash, req.user.id]);
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
    return res_.ok(res, {}, 'Password changed. Please log in again.');
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout, me, changePassword };
