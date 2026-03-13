const { query } = require('../config/database');
const res_      = require('../utils/response');

const listCategories = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM categories ORDER BY name');
    return res_.ok(res, { categories: rows, total: rows.length });
  } catch (err) { next(err); }
};

const getCategory = async (req, res, next) => {
  try {
    const { rows: [cat] } = await query(
      'SELECT * FROM categories WHERE id=$1 OR slug=$1', [req.params.id]
    );
    if (!cat) return res_.notFound(res, 'Category not found');
    return res_.ok(res, { category: cat });
  } catch (err) { next(err); }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, description = '' } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { rows: [cat] } = await query(
      `INSERT INTO categories (name, slug, description) VALUES ($1,$2,$3) RETURNING *`,
      [name, slug, description]
    );
    return res_.created(res, { category: cat }, 'Category created');
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const { rows: [existing] } = await query('SELECT * FROM categories WHERE id=$1', [req.params.id]);
    if (!existing) return res_.notFound(res, 'Category not found');
    const newName = name ?? existing.name;
    const newSlug = newName.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
    const { rows: [cat] } = await query(
      `UPDATE categories SET name=$1, slug=$2, description=$3 WHERE id=$4 RETURNING *`,
      [newName, newSlug, description ?? existing.description, req.params.id]
    );
    return res_.ok(res, { category: cat }, 'Category updated');
  } catch (err) { next(err); }
};

const deleteCategory = async (req, res, next) => {
  try {
    const { rows: [existing] } = await query('SELECT id FROM categories WHERE id=$1', [req.params.id]);
    if (!existing) return res_.notFound(res, 'Category not found');
    await query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    return res_.noContent(res);
  } catch (err) { next(err); }
};

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
