import fs from 'node:fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Use the API port from server/.env (API_PORT or PORT) so the proxy and the API never disagree. */
function apiPort() {
  try {
    const env = fs.readFileSync(new URL('../server/.env', import.meta.url), 'utf8');
    return env.match(/^API_PORT=(\d+)/m)?.[1] ?? env.match(/^PORT=(\d+)/m)?.[1] ?? '5050';
  } catch {
    return '5050';
  }
}

// In dev, /api and /uploads are proxied to Express so the auth cookie stays same-origin.
const API_TARGET = process.env.API_PROXY_TARGET || `http://localhost:${apiPort()}`;
const proxy = {
  '/api': { target: API_TARGET, changeOrigin: true },
  '/uploads': { target: API_TARGET, changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, proxy },
});
