import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { DEMO_ACCOUNTS } from '../seed/data.js';
import { clearAuthCookie, setAuthCookie } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash;
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('not-a-real-password', 12));

export async function register(req, res) {
  const { name, email, password, phone = '' } = req.body;
  if (await User.exists({ email })) {
    const msg = 'An account with this email already exists. Try signing in instead.';
    throw ApiError.conflict(msg, { email: msg });
  }
  // Public sign-up always creates a normal user; admins come from the seed script.
  const user = await User.create({ name, email, phone, role: 'user', passwordHash: await User.hashPassword(password) });
  setAuthCookie(res, user);
  res.status(201).json({ success: true, message: 'Account created. Welcome!', data: { user: user.toSafeJSON() } });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user ? await user.checkPassword(password) : (await bcrypt.compare(password, await getDummyHash()), false);
  if (!ok) throw ApiError.unauthorized('Email or password is incorrect.');
  setAuthCookie(res, user);
  res.json({ success: true, message: `Welcome back, ${user.name.split(' ')[0]}!`, data: { user: user.toSafeJSON() } });
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Signed out.' });
}

/** GET /api/auth/demo: accounts for the one-click demo buttons (empty list when DEMO_LOGINS is off). */
export function listDemoAccounts(_req, res) {
  const accounts = env.DEMO_LOGINS ? DEMO_ACCOUNTS.map(({ key, label, email }) => ({ key, label, email })) : [];
  res.json({ success: true, data: { accounts } });
}

/** POST /api/auth/demo { account }: sign in as a seeded demo account without a password. */
export async function demoLogin(req, res) {
  if (!env.DEMO_LOGINS) throw ApiError.notFound('Demo sign-in is turned off.');
  const account = DEMO_ACCOUNTS.find((a) => a.key === req.body.account);
  const user = await User.findOne({ email: account.email });
  if (!user) throw ApiError.notFound('Demo account not found. Run `npm run seed` to create the demo data.');
  setAuthCookie(res, user);
  res.json({ success: true, message: `Signed in as ${account.label} (demo).`, data: { user: user.toSafeJSON() } });
}

/** Returns { user: null } (200) when signed out, so the client can bootstrap without a console 401. */
export function me(req, res) {
  res.json({ success: true, data: { user: req.user ? req.user.toSafeJSON() : null } });
}
