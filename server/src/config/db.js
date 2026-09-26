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
        const hint = usingEmbeddedDb()
          ? 'Start it with `npm run dev` (project root) or `npm run db`, or set DB_URL in server/.env.'
          : 'Check DB_URL in server/.env.';
        console.log(`[db] waiting for MongoDB at ${redact(url)} (${err.message}). ${hint}`);
      }
      await sleep(2000);
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
