import { useCallback, useEffect, useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { api } from '../lib/api.js';

/**
 * GET `path` (with optional `query`) and track { data, error, loading }.
 * Re-fetches when path/query change or after any invalidate(). With keepPrevious (default)
 * the old data stays on screen while refreshing, so lists don't flash empty.
 */
export function useApi(path, { query, enabled = true, keepPrevious = true } = {}) {
  const { version } = useData();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(enabled && path) });
  const queryKey = JSON.stringify(query ?? null);

  useEffect(() => {
    if (!enabled || !path) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }
    const controller = new AbortController();
    setState((s) => ({ data: keepPrevious ? s.data : null, error: null, loading: true }));
    api(path, { query: JSON.parse(queryKey), signal: controller.signal })
      .then((json) => setState({ data: json.data, error: null, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((s) => ({ data: s.data, error, loading: false }));
      });
    return () => controller.abort();
  }, [path, queryKey, enabled, keepPrevious, version, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
