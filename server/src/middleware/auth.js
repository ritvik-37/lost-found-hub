import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { AUTH_COOKIE } from '../constants.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const sameSite = ['strict', 'lax', 'none'].includes(env.COOKIE_SAMESITE) ? env.COOKIE_SAMESITE : 'lax';

const baseCookie = () => ({
  httpOnly: true,
  secure: env.isProd || sameSite === 'none',
  sameSite,
  path: '/',
});

export function setAuthCookie(res, user) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
  const { exp } = jwt.decode(token);
  res.cookie(AUTH_COOKIE, token, { ...baseCookie(), maxAge: exp * 1000 - Date.now() });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, baseCookie());
}

/** Attach req.user (or null) from the httpOnly JWT cookie. Never throws for a bad/expired token. */
export async function loadUser(req, res, next) {
  req.user = null;
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return next();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    clearAuthCookie(res);
    return next();
  }
  if (!mongoose.isValidObjectId(payload.sub)) {
    clearAuthCookie(res);
    return next();
  }
  const user = await User.findById(payload.sub);
  if (user) req.user = user;
  else clearAuthCookie(res);
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== 'admin') return next(ApiError.forbidden('Admins only.'));
  next();
}

export const isAdmin = (user) => user?.role === 'admin';
