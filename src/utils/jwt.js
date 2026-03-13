const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET          || 'dev_access_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'dev_refresh_secret';
const ACCESS_EXPIRY  = process.env.JWT_EXPIRES_IN       || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const signAccess = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });

const signRefresh = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

const verifyAccess = (token) =>
  jwt.verify(token, ACCESS_SECRET);

const verifyRefresh = (token) =>
  jwt.verify(token, REFRESH_SECRET);

const decodeNoVerify = (token) =>
  jwt.decode(token);

/** Returns Date object for refresh token expiry */
const refreshExpiry = () => {
  const days = parseInt(REFRESH_EXPIRY) || 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh, decodeNoVerify, refreshExpiry };
