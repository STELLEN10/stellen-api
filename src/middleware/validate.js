const { validationResult } = require('express-validator');
const { badRequest }       = require('../utils/response');

/**
 * Reads express-validator results and returns 400 if any errors found.
 * Place after validator chains in routes.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return badRequest(
    res,
    'Validation failed',
    errors.array().map(e => ({ field: e.path, message: e.msg }))
  );
};

module.exports = { validate };
