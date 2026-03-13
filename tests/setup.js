// Shared test utilities — token helpers, mock DB, etc.
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app     = require('../src/app');
const { query, pool } = require('../src/config/database');
const jwtUtil = require('../src/utils/jwt');
const bcrypt  = require('bcryptjs');

let adminUser, regularUser, adminToken, userToken;

/** Create test users, return tokens */
const setupUsers = async () => {
  const hash = await bcrypt.hash('Test@1234', 10);

  const { rows: [admin] } = await query(
    `INSERT INTO users (name, email, password, role)
     VALUES ('Test Admin','admin_test@test.com',$1,'admin')
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
    [hash]
  );
  const { rows: [user] } = await query(
    `INSERT INTO users (name, email, password, role)
     VALUES ('Test User','user_test@test.com',$1,'user')
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
    [hash]
  );

  adminUser  = admin;
  regularUser = user;
  adminToken = jwtUtil.signAccess({ id: admin.id, role: 'admin' });
  userToken  = jwtUtil.signAccess({ id: user.id,  role: 'user'  });
  return { adminUser, regularUser, adminToken, userToken };
};

const teardown = async () => {
  await query(`DELETE FROM users WHERE email LIKE '%_test@test.com'`);
  await pool.end();
};

module.exports = { request, app, query, setupUsers, teardown };
