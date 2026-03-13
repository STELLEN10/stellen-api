const bcrypt    = require('bcryptjs');
const { query } = require('../config/database');
const res_      = require('../utils/response');

const listUsers = async (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const params = [];
    let where = '';
    if (search) {
      where = `WHERE name ILIKE $1 OR email ILIKE $1`;
      params.push(`%${search}%`);
    }

    const total = parseInt((await query(`SELECT COUNT(*) FROM users ${where}`, params)).rows[0].count);
    const { rows } = await query(
      `SELECT id, name, email, role, is_active, created_at, updated_at
       FROM users ${where} ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    return res_.ok(res, res_.paginate(rows, total, page, limit));
  } catch (err) { next(err); }
};

const getUser = async (req, res, next) => {
  try {
    const { rows: [user] } = await query(
      'SELECT id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!user) return res_.notFound(res, 'User not found');
    return res_.ok(res, { user });
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, is_active } = req.body;
    const { rows: [existing] } = await query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!existing) return res_.notFound(res, 'User not found');

    const { rows: [user] } = await query(
      `UPDATE users SET name=$1, email=$2, role=$3, is_active=$4 WHERE id=$5
       RETURNING id, name, email, role, is_active, updated_at`,
      [
        name      ?? existing.name,
        email     ?? existing.email,
        role      ?? existing.role,
        is_active ?? existing.is_active,
        req.params.id,
      ]
    );
    return res_.ok(res, { user }, 'User updated');
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id)
      return res_.badRequest(res, 'Cannot delete your own account');
    const { rows: [existing] } = await query('SELECT id FROM users WHERE id=$1', [req.params.id]);
    if (!existing) return res_.notFound(res, 'User not found');
    await query('DELETE FROM users WHERE id=$1', [req.params.id]);
    return res_.noContent(res);
  } catch (err) { next(err); }
};

module.exports = { listUsers, getUser, updateUser, deleteUser };
