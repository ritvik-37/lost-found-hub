import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, UNAUTHORIZED_EVENT } from '../lib/api.js';
import { useData } from './DataContext.jsx';

const AuthContext = createContext(null);

/**
 * The signed-in user comes from the httpOnly JWT cookie via GET /api/auth/me.
 * Role (student/admin) is whatever the server says; the client never decides it.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const { invalidate } = useData();

  useEffect(() => {
    api('/api/auth/me')
      .then((json) => setUser(json.data.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));

    const onUnauthorized = () => setUser(null);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(
    async (credentials) => {
      const json = await api('/api/auth/login', { method: 'POST', body: credentials });
      setUser(json.data.user);
      invalidate();
      return json;
    },
    [invalidate],
  );

  /** One-click sign-in as a seeded demo account (the server decides whether this is allowed). */
  const demoLogin = useCallback(
    async (account) => {
      const json = await api('/api/auth/demo', { method: 'POST', body: { account } });
      setUser(json.data.user);
      invalidate();
      return json;
    },
    [invalidate],
  );

  const register = useCallback(
    async (payload) => {
      const json = await api('/api/auth/register', { method: 'POST', body: payload });
      setUser(json.data.user);
      invalidate();
      return json;
    },
    [invalidate],
  );

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    invalidate();
  }, [invalidate]);

  const value = useMemo(
    () => ({ user, ready, isAdmin: user?.role === 'admin', login, demoLogin, register, logout }),
    [user, ready, login, demoLogin, register, logout],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);
