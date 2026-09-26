import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export function apiNotFound(req, _res, next) {
  next(ApiError.notFound(`No API route for ${req.method} ${req.originalUrl.split('?')[0]}.`));
}

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'Image must be 5 MB or smaller.',
  LIMIT_UNEXPECTED_FILE: 'Upload a single image in the "image" field.',
  LIMIT_FILE_COUNT: 'Upload only one image.',
};

/** Centralised error handler: every error leaves the API as { success: false, message, errors }. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let errors;

  if (err instanceof ApiError) {
    ({ status, message, errors } = err);
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = MULTER_MESSAGES[err.code] ?? 'Upload failed. Please try a different image.';
    errors = { image: message };
  } else if (err?.name === 'ValidationError' && err.errors) {
    // Mongoose schema validation (should be rare: Zod runs first).
    status = 400;
    message = 'Please fix the highlighted fields.';
    errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err?.name === 'CastError') {
    status = 404;
    message = 'Not found.';
  } else if (err?.code === 11000) {
    status = 409;
    message = 'That record already exists.';
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body is not valid JSON.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    message = 'The request is too large.';
  } else if (err?.status === 404 || err?.statusCode === 404) {
    status = 404;
    message = 'Not found.';
  }

  if (status >= 500) console.error('[error]', req.method, req.originalUrl, err);

  res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
}
