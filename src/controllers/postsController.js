const { query }  = require('../config/database');
const res_       = require('../utils/response');
const logger     = require('../utils/logger');

// ── List Posts ────────────────────────────────────────────────
const listPosts = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search, tag, published, user_id } = req.query;

    const conditions = [];
    const params     = [];
    let   p          = 1;

    // Only admins see unpublished posts from others
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin) {
      conditions.push(`(po.published = true OR po.user_id = $${p++})`);
      params.push(req.user?.id || '00000000-0000-0000-0000-000000000000');
    } else if (published !== undefined) {
      conditions.push(`po.published = $${p++}`);
      params.push(published === 'true');
    }

    if (search) {
      conditions.push(`(po.title ILIKE $${p} OR po.content ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }
    if (tag) {
      conditions.push(`$${p++} = ANY(po.tags)`);
      params.push(tag);
    }
    if (user_id) {
      conditions.push(`po.user_id = $${p++}`);
      params.push(user_id);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) FROM posts po ${where}`;
    const dataSql  = `
      SELECT po.id, po.title, po.content, po.tags, po.published,
             po.created_at, po.updated_at,
             json_build_object('id', u.id, 'name', u.name, 'email', u.email) AS author
      FROM posts po
      JOIN users u ON u.id = po.user_id
      ${where}
      ORDER BY po.created_at DESC
      LIMIT $${p} OFFSET $${p + 1}
    `;

    const [countRes, dataRes] = await Promise.all([
      query(countSql, params),
      query(dataSql,  [...params, limit, offset]),
    ]);

    const total = parseInt(countRes.rows[0].count);
    return res_.ok(res, res_.paginate(dataRes.rows, total, page, limit));
  } catch (err) { next(err); }
};

// ── Get One ───────────────────────────────────────────────────
const getPost = async (req, res, next) => {
  try {
    const { rows: [post] } = await query(
      `SELECT po.*, json_build_object('id', u.id, 'name', u.name, 'email', u.email) AS author
       FROM posts po JOIN users u ON u.id = po.user_id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (!post) return res_.notFound(res, 'Post not found');

    const isOwner = req.user?.id === post.user_id;
    const isAdmin = req.user?.role === 'admin';
    if (!post.published && !isOwner && !isAdmin)
      return res_.notFound(res, 'Post not found');

    return res_.ok(res, { post });
  } catch (err) { next(err); }
};

// ── Create ────────────────────────────────────────────────────
const createPost = async (req, res, next) => {
  try {
    const { title, content, tags = [], published = false } = req.body;
    const { rows: [post] } = await query(
      `INSERT INTO posts (user_id, title, content, tags, published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, title, content, tags, published]
    );
    logger.info('Post created', { postId: post.id, userId: req.user.id });
    return res_.created(res, { post }, 'Post created');
  } catch (err) { next(err); }
};

// ── Update ────────────────────────────────────────────────────
const updatePost = async (req, res, next) => {
  try {
    const { rows: [existing] } = await query('SELECT * FROM posts WHERE id = $1', [req.params.id]);
    if (!existing) return res_.notFound(res, 'Post not found');

    const isOwner = req.user.id === existing.user_id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res_.forbidden(res);

    const { title, content, tags, published } = req.body;
    const updated = {
      title:     title     ?? existing.title,
      content:   content   ?? existing.content,
      tags:      tags      ?? existing.tags,
      published: published ?? existing.published,
    };

    const { rows: [post] } = await query(
      `UPDATE posts SET title=$1, content=$2, tags=$3, published=$4
       WHERE id=$5 RETURNING *`,
      [updated.title, updated.content, updated.tags, updated.published, req.params.id]
    );
    return res_.ok(res, { post }, 'Post updated');
  } catch (err) { next(err); }
};

// ── Delete ────────────────────────────────────────────────────
const deletePost = async (req, res, next) => {
  try {
    const { rows: [existing] } = await query('SELECT user_id FROM posts WHERE id = $1', [req.params.id]);
    if (!existing) return res_.notFound(res, 'Post not found');

    const isOwner = req.user.id === existing.user_id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res_.forbidden(res);

    await query('DELETE FROM posts WHERE id = $1', [req.params.id]);
    logger.info('Post deleted', { postId: req.params.id, userId: req.user.id });
    return res_.noContent(res);
  } catch (err) { next(err); }
};

module.exports = { listPosts, getPost, createPost, updatePost, deletePost };
