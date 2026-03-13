const { body, query, param } = require('express-validator');

const createPostRules = [
  body('title')
    .trim().notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 255 }).withMessage('Title must be 3–255 characters'),
  body('content')
    .trim().notEmpty().withMessage('Content is required')
    .isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('tags')
    .optional().isArray().withMessage('Tags must be an array')
    .custom(arr => arr.every(t => typeof t === 'string')).withMessage('All tags must be strings'),
  body('published')
    .optional().isBoolean().withMessage('Published must be boolean'),
];

const updatePostRules = [
  body('title')
    .optional().trim().isLength({ min: 3, max: 255 }).withMessage('Title must be 3–255 characters'),
  body('content')
    .optional().trim().isLength({ min: 10 }).withMessage('Content must be at least 10 characters'),
  body('tags')
    .optional().isArray(),
  body('published')
    .optional().isBoolean(),
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100').toInt(),
];

const uuidParam = (name = 'id') => [
  param(name).isUUID().withMessage(`${name} must be a valid UUID`),
];

module.exports = { createPostRules, updatePostRules, paginationRules, uuidParam };
