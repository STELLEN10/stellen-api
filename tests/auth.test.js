const { request, app, query, setupUsers, teardown } = require('./setup');

describe('Auth Routes', () => {
  let tokens;

  beforeAll(async () => { tokens = await setupUsers(); });
  afterAll(async () => { await teardown(); });

  // ── Register ──────────────────────────────────────────────
  describe('POST /api/v1/auth/register', () => {
    const unique = `reg_${Date.now()}@test.com`;

    it('registers a new user and returns tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'New User', email: unique, password: 'Secure@1234' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe(unique);
      expect(res.body.user.password).toBeUndefined(); // no password leak

      // Cleanup
      await query(`DELETE FROM users WHERE email = $1`, [unique]);
    });

    it('rejects duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Dup', email: 'admin_test@test.com', password: 'Secure@1234' });
      expect(res.status).toBe(400);
    });

    it('rejects weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Weak', email: 'weak@test.com', password: 'weak' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('rejects missing fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({});
      expect(res.status).toBe(400);
    });
  });

  // ── Login ─────────────────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin_test@test.com', password: 'Test@1234' });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin_test@test.com', password: 'Wrong@9999' });
      expect(res.status).toBe(401);
    });

    it('rejects non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'Test@1234' });
      expect(res.status).toBe(401);
    });
  });

  // ── Me ────────────────────────────────────────────────────
  describe('GET /api/v1/auth/me', () => {
    it('returns own profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('admin_test@test.com');
    });

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });
});
