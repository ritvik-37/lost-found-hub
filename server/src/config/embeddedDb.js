import fs from 'node:fs';
import net from 'node:net';
import { env } from './env.js';

/** Resolves true if something is already listening on the embedded DB port. */
export function isEmbeddedDbRunning(port = env.LOCAL_DB_PORT) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
  });
}

/**
 * Start a real mongod binary (downloaded by mongodb-memory-server) with an on-disk
 * data directory, so demo data survives restarts. Dev-only: needs devDependencies.
 */
export async function startEmbeddedDb() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  fs.mkdirSync(env.LOCAL_DB_PATH, { recursive: true });
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: env.LOCAL_DB_PORT,
      ip: '127.0.0.1',
      dbPath: env.LOCAL_DB_PATH,
      storageEngine: 'wiredTiger',
    },
  });
  return {
    mongod,
    stop: () => mongod.stop({ doCleanup: false }),
  };
}
