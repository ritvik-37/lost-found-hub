// Thin fetch wrapper. Every call sends the httpOnly auth cookie and unwraps the
// API's { success, message, data, errors } envelope.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, errors = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

/** Fired when the server says the session is gone, so AuthContext can sign the user out. */
export const UNAUTHORIZED_EVENT = 'lfh:unauthorized';

export async function api(path, { method = 'GET', body, query, signal } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const init = { method, credentials: 'include', signal, headers: { Accept: 'application/json' } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError("Can't reach the server. Check your connection and try again.");
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success === false) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(json?.message || `Request failed (${res.status}). Please try again.`, res.status, json?.errors);
  }
  return json ?? { success: true, data: null };
}

/** Uploaded images are served by the API ("/uploads/..."); prefix the API origin on split deploys. */
export const assetUrl = (path) => (path && path.startsWith('/') ? BASE + path : path);
