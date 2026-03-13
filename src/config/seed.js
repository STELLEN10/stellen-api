require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./database');
const logger   = require('../utils/logger');

async function seed() {
  const client = await pool.connect();
  try {
    logger.info('Seeding database...');
    await client.query('BEGIN');

    // Admin user
    const hash = await bcrypt.hash('Admin@1234', 12);
    const { rows: [admin] } = await client.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['Stellen Ncube', 'admin@stellenapi.dev', hash, 'admin']
    );

    // Demo user
    const hash2 = await bcrypt.hash('User@1234', 12);
    const { rows: [demo] } = await client.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      ['Demo User', 'demo@stellenapi.dev', hash2, 'user']
    );

    // Categories
    const cats = [
      { name: 'Technology', slug: 'technology', description: 'Tech and software posts' },
      { name: 'Development', slug: 'development', description: 'Software development' },
      { name: 'Design',      slug: 'design',      description: 'UI/UX and visual design' },
    ];
    const catIds = [];
    for (const cat of cats) {
      const { rows: [c] } = await client.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [cat.name, cat.slug, cat.description]
      );
      catIds.push(c.id);
    }

    // Posts
    const posts = [
      { title: 'Getting Started with REST APIs', content: 'A comprehensive guide to building REST APIs with Express and PostgreSQL. Covers authentication, validation, and deployment.', tags: ['api', 'express', 'node'], published: true },
      { title: 'JWT Authentication Deep Dive',    content: 'Everything you need to know about JSON Web Tokens — access tokens, refresh tokens, rotation, and secure storage.', tags: ['jwt', 'security', 'auth'], published: true },
      { title: 'Docker for Node.js Developers',   content: 'Containerise your Node.js API with Docker and Docker Compose. Production-ready multi-stage builds included.', tags: ['docker', 'devops', 'node'], published: true },
      { title: 'PostgreSQL Performance Tips',      content: 'Indexes, query planning, connection pooling, and EXPLAIN ANALYSE — level up your Postgres game.', tags: ['postgres', 'database', 'performance'], published: false },
    ];
    for (const p of posts) {
      const { rows: [post] } = await client.query(
        `INSERT INTO posts (user_id, title, content, tags, published)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [admin.id, p.title, p.content, p.tags, p.published]
      );
      if (post) {
        await client.query(
          `INSERT INTO post_categories VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [post.id, catIds[0]]
        );
      }
    }

    await client.query('COMMIT');
    logger.info('✅  Seed completed');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Seed failed', { error: err.message });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
