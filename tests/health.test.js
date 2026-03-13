const { request, app, teardown } = require('./setup');

describe('Health Route', () => {
  afterAll(teardown);

  it('GET /api/v1/health returns 200 with status fields', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status); // 503 if no DB in CI
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.version).toBeDefined();
  });

  it('GET / returns API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.docs).toBe('/docs');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/doesnotexist');
    expect(res.status).toBe(404);
  });
});
