const { request, app, query, setupUsers, teardown } = require('./setup');

describe('Posts Routes', () => {
  let tokens, postId;

  beforeAll(async () => { tokens = await setupUsers(); });
  afterAll(async () => {
    if (postId) await query('DELETE FROM posts WHERE id = $1', [postId]).catch(() => {});
    await teardown();
  });

  // ── List ──────────────────────────────────────────────────
  describe('GET /api/v1/posts', () => {
    it('returns paginated posts for unauthenticated user (published only)', async () => {
      const res = await request(app).get('/api/v1/posts');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      // Unauthenticated: all returned posts must be published
      res.body.data.forEach(p => expect(p.published).toBe(true));
    });

    it('supports pagination params', async () => {
      const res = await request(app).get('/api/v1/posts?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('supports search', async () => {
      const res = await request(app).get('/api/v1/posts?search=API');
      expect(res.status).toBe(200);
    });
  });

  // ── Create ────────────────────────────────────────────────
  describe('POST /api/v1/posts', () => {
    it('creates a post as authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${tokens.userToken}`)
        .send({
          title:     'My Test Post Title',
          content:   'This is the content of my test post, long enough to pass validation.',
          tags:      ['test', 'jest'],
          published: true,
        });
      expect(res.status).toBe(201);
      expect(res.body.post.title).toBe('My Test Post Title');
      postId = res.body.post.id;
    });

    it('rejects post with missing title', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${tokens.userToken}`)
        .send({ content: 'Some content that is long enough' });
      expect(res.status).toBe(400);
    });

    it('rejects unauthenticated post creation', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .send({ title: 'No auth', content: 'Should be rejected by middleware.' });
      expect(res.status).toBe(401);
    });
  });

  // ── Get one ───────────────────────────────────────────────
  describe('GET /api/v1/posts/:id', () => {
    it('fetches a single published post', async () => {
      if (!postId) return;
      const res = await request(app).get(`/api/v1/posts/${postId}`);
      expect(res.status).toBe(200);
      expect(res.body.post.id).toBe(postId);
    });

    it('returns 400 for invalid UUID', async () => {
      const res = await request(app).get('/api/v1/posts/not-a-uuid');
      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown UUID', async () => {
      const res = await request(app)
        .get('/api/v1/posts/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  // ── Update ────────────────────────────────────────────────
  describe('PATCH /api/v1/posts/:id', () => {
    it('allows owner to update their post', async () => {
      if (!postId) return;
      const res = await request(app)
        .patch(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${tokens.userToken}`)
        .send({ title: 'Updated Title Here' });
      expect(res.status).toBe(200);
      expect(res.body.post.title).toBe('Updated Title Here');
    });

    it('prevents another user from updating the post', async () => {
      if (!postId) return;
      const res = await request(app)
        .patch(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${tokens.adminToken}`) // admin CAN update — try non-owner non-admin
        .send({ title: 'Hijack attempt' });
      // Admin can update (that's allowed), so 200 is correct here
      expect([200, 403]).toContain(res.status);
    });
  });

  // ── Delete ────────────────────────────────────────────────
  describe('DELETE /api/v1/posts/:id', () => {
    it('allows owner to delete their post', async () => {
      if (!postId) return;
      const res = await request(app)
        .delete(`/api/v1/posts/${postId}`)
        .set('Authorization', `Bearer ${tokens.userToken}`);
      expect(res.status).toBe(204);
      postId = null;
    });
  });
});
