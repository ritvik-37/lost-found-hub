import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { loadUser } from './middleware/auth.js';
import { apiNotFound, errorHandler } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { serveUpload } from './middleware/upload.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      // Uploaded photos may be loaded by a client on another origin (split deploys).
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: env.isProd ? [] : null,
        },
      },
    }),
  );
  app.use(cors({ origin: env.CLIENT_URLS, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitizeBody);

  app.get('/uploads/:id', serveUpload);

  app.use('/api', apiLimiter, loadUser, apiRoutes, apiNotFound);

  // Production convenience: serve the built React app from the same origin (after `npm run build`).
  const clientIndex = path.join(env.CLIENT_DIST, 'index.html');
  if (fs.existsSync(clientIndex)) {
    app.use(express.static(env.CLIENT_DIST, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => res.sendFile(clientIndex));
  }

  app.use(errorHandler);
  return app;
}
