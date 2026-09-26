// Runs the embedded MongoDB used for local development (started by `npm run dev`).
import { env } from '../src/config/env.js';
import { isEmbeddedDbRunning, startEmbeddedDb } from '../src/config/embeddedDb.js';

const keepAlive = () => setInterval(() => {}, 1 << 30);

if (env.DB_URL) {
  console.log('[db] DB_URL is set in server/.env, so the embedded MongoDB is not needed.');
  keepAlive();
} else if (await isEmbeddedDbRunning()) {
  console.log(`[db] MongoDB is already running on port ${env.LOCAL_DB_PORT}; reusing it.`);
  keepAlive();
} else {
  console.log('[db] starting embedded MongoDB (the first run downloads the binary, which can take a minute)...');
  const db = await startEmbeddedDb();
  console.log(`[db] ready at ${db.mongod.getUri()} (data: ${env.LOCAL_DB_PATH})`);
  const shutdown = async () => {
    await db.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
