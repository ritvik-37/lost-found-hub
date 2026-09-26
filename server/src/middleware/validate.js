import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { toFieldErrors } from '../validators/common.js';

// Treat "?type=" the same as leaving the parameter out.
const dropEmpty = (obj) => Object.fromEntries(Object.entries(obj ?? {}).filter(([, v]) => v !== ''));

/**
 * Validate req.body / req.query with Zod schemas. Parsed values land in req.valid.{body,query}
 * (and req.body is replaced with the cleaned body). Express 5's req.query is read-only.
 */
export const validate = (schemas) => (req, _res, next) => {
  const errors = {};
  req.valid ??= {};
  for (const [part, schema] of Object.entries(schemas)) {
    const input = part === 'query' ? dropEmpty(req.query) : { ...(req[part] ?? {}) };
    const result = schema.safeParse(input);
    if (result.success) req.valid[part] = result.data;
    else Object.assign(errors, toFieldErrors(result.error));
  }
  if (Object.keys(errors).length) {
    const message = schemas.body ? 'Please fix the highlighted fields.' : 'Some filters are invalid.';
    return next(ApiError.badRequest(message, errors));
  }
  if (req.valid.body) req.body = req.valid.body;
  next();
};

/** 404 early for ids that cannot exist (also avoids Mongoose CastErrors). */
export const validId = (label) => (req, _res, next) => {
  const { id } = req.params;
  if (!/^[a-f\d]{24}$/i.test(id) || !mongoose.isValidObjectId(id)) return next(ApiError.notFound(`${label} not found.`));
  next();
};
