import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const limiter = (options, message) =>
  rateLimit({
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, res) => res.status(429).json({ success: false, message }),
    ...options,
  });

/** Only failed sign-ins count, so a demo that keeps switching accounts is never blocked. */
export const loginLimiter = limiter(
  { windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true },
  'Too many failed sign-in attempts. Please wait 15 minutes and try again.',
);

export const registerLimiter = limiter(
  { windowMs: 60 * 60 * 1000, limit: 10 },
  'Too many accounts created from this network. Please try again in an hour.',
);

/** Caps new reports and claims per network, so a public demo can't be flooded (photos live in the DB). */
export const submitLimiter = limiter(
  { windowMs: 60 * 60 * 1000, limit: 30 },
  'Too many reports or claims from this network in the last hour. Please try again later.',
);

export const apiLimiter = limiter(
  { windowMs: 60 * 1000, limit: 300 },
  'Too many requests. Please slow down and try again in a minute.',
);
