import { env } from './config/env.js';
import { connectDB, disconnectDB, usingEmbeddedDb } from './config/db.js';
import { createApp } from './app.js';
import { describeLogins, seedIfEmpty } from './seed/seed.js';

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaught exception:', err);
  process.exit(1);
});

await connectDB();

// Auto-seed the local embedded DB, or a real DB only when SEED_ON_EMPTY=true (e.g. the hosted demo).
if (usingEmbeddedDb() || env.SEED_ON_EMPTY) {
  const seeded = await seedIfEmpty();
  if (seeded) {
    console.log('[seed] empty database detected; demo data loaded. Logins (or use the demo buttons):');
    for (const line of describeLogins(seeded.passwords)) console.log(line);
  }
}

const server = createApp().listen(env.PORT, () => {
  console.log(`[api] listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`[api] ${signal} received, shutting down`);
  server.close();
  await disconnectDB().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
