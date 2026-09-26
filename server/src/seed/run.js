// `npm run seed`: wipes users, items, claims and uploaded photos, then loads the demo data.
import { connectDB, disconnectDB, resolveDbUrl, usingEmbeddedDb } from '../config/db.js';
import { isEmbeddedDbRunning, startEmbeddedDb } from '../config/embeddedDb.js';
import { describeLogins, seedDatabase } from './seed.js';

let embedded = null;
try {
  // If the embedded DB isn't already running (via `npm run dev`), start it just for seeding.
  if (usingEmbeddedDb() && !(await isEmbeddedDbRunning())) {
    console.log('[seed] starting embedded MongoDB...');
    embedded = await startEmbeddedDb();
  }
  await connectDB(resolveDbUrl(), { retries: 5 });
  const { passwords } = await seedDatabase();

  console.log('\nDemo accounts (or use the one-click demo buttons on the sign-in page):');
  for (const line of describeLogins(passwords)) console.log(line);
} catch (err) {
  console.error('[seed] failed:', err);
  process.exitCode = 1;
} finally {
  await disconnectDB().catch(() => {});
  if (embedded) await embedded.stop().catch(() => {});
}
