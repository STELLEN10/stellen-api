/**
 * Standardised JSON response helpers.
 */

const ok = (res, data = {}, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, ...data });

const created = (res, data = {}, message = 'Created') =>
  ok(res, data, message, 201);

const noContent = (res) =>
  res.status(204).send();

const error = (res, message = 'Something went wrong', status = 500, errors = []) =>
  res.status(status).json({ success: false, message, ...(errors.length ? { errors } : {}) });

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 404);

const unauthorised = (res, message = 'Unauthorised') =>
  error(res, message, 401);

const forbidden = (res, message = 'Forbidden') =>
  error(res, message, 403);

const badRequest = (res, message = 'Bad request', errors = []) =>
  error(res, message, 400, errors);

const paginate = (data, total, page, limit) => ({
  data,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});

module.exports = { ok, created, noContent, error, notFound, unauthorised, forbidden, badRequest, paginate };
