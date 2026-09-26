import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Load server/.env when present (Node >= 20.12 has a built-in loader, no dotenv needed).
const envPath = path.join(SERVER_ROOT, '.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production. See server/.env.example.');
}

const trustProxy = process.env.TRUST_PROXY?.trim();

export const env = Object.freeze({
  isProd,
  isTest,
  // API_PORT wins over PORT so tools that inject PORT for the frontend (e.g. preview runners) don't clash.
  PORT: Number(process.env.API_PORT || process.env.PORT) || 5050,
  DB_URL: process.env.DB_URL?.trim() || '',
  LOCAL_DB_PORT: Number(process.env.LOCAL_DB_PORT) || 27027,
  LOCAL_DB_PATH: process.env.LOCAL_DB_PATH?.trim() || path.join(os.homedir(), '.lost-found-hub', 'mongo-data'),
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret-set-JWT_SECRET-in-server-env',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URLS: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  COOKIE_SAMESITE: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
  ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase() || '',
  TRUST_PROXY: trustProxy ? (Number.isNaN(Number(trustProxy)) ? trustProxy : Number(trustProxy)) : false,
  /** Load the demo data on startup when the database has no users (always on for the embedded dev DB). */
  SEED_ON_EMPTY: process.env.SEED_ON_EMPTY === 'true',
  /**
   * One-click demo sign-in (POST /api/auth/demo) for the seeded accounts, so no password ships to the
   * browser. On by default outside production; the hosted demo turns it on explicitly.
   * Anyone who can open the site can then act as the demo admin.
   */
  DEMO_LOGINS: process.env.DEMO_LOGINS ? process.env.DEMO_LOGINS === 'true' : !isProd,
  DEMO_ADMIN_PASSWORD: process.env.DEMO_ADMIN_PASSWORD || '',
  DEMO_STUDENT_PASSWORD: process.env.DEMO_STUDENT_PASSWORD || '',
  CLIENT_DIST: path.resolve(SERVER_ROOT, '..', 'client', 'dist'),
});
