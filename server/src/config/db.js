import mongoose from 'mongoose';
import { env } from './env.js';

export const usingEmbeddedDb = () => !env.DB_URL;
export const embeddedDbUrl = () => `mongodb://127.0.0.1:${env.LOCAL_DB_PORT}/lostfoundhub`;
export const resolveDbUrl = () => env.DB_URL || embeddedDbUrl();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const redact = (url) => url.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:****@');

/**
 * Connect Mongoose, retrying while the database boots (the embedded DB runs in a
 * sibling process started by `npm run dev`, so it may come up a second after the API).
 */
export async function connectDB(url = resolveDbUrl(), { retries = Infinity, quiet = false } = {}) {
  mongoose.set('strictQuery', true);
  // Atlas's copied string contains placeholders like <db_username> / <db_password> that must be replaced.
  const placeholder = url.match(/<[^>]+>/)?.[0];
  if (placeholder) {
    console.error(`[db] DB_URL still contains the placeholder ${placeholder}. Replace it (including < >) with the real value.`);
  }
  for (let attempt = 1; ; attempt++) {
    try {
      // Atlas strings often have no database name; use ours instead of Mongo's default "test".
      const hasDbName = /^mongodb(?:\+srv)?:\/\/[^/]+\/[^?]+/.test(url);
      await mongoose.connect(url, { serverSelectionTimeoutMS: 5000, ...(hasDbName ? {} : { dbName: 'lostfoundhub' }) });
      if (!quiet) console.log(`[db] connected to ${redact(url)}`);
      return mongoose.connection;
    } catch (err) {
      if (attempt > retries) throw err;
      if (!quiet && (attempt === 1 || attempt % 5 === 0)) {
        let hint = usingEmbeddedDb()
          ? 'Start it with `npm run dev` (project root) or `npm run db`, or set DB_URL in server/.env.'
          : 'Check DB_URL (server/.env locally, or the Environment settings of your host).';
        if (/bad auth|authentication failed/i.test(err.message)) {
          hint = placeholder
            ? `Replace ${placeholder} in DB_URL with the real value.`
            : 'Username or password in DB_URL is wrong. Check the database user in Atlas (Database Access).';
        } else if (/whitelist|IP|timed out|ENOTFOUND/i.test(err.message) && !usingEmbeddedDb()) {
          hint += ' In Atlas, make sure the Network Access list contains 0.0.0.0/0.';
        }
        console.log(`[db] waiting for MongoDB at ${redact(url)} (${err.message}). ${hint}`);
      }
      await sleep(2000);
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
