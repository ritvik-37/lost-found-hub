import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * A tiny "something changed" signal. Every useApi() call re-fetches when `version` bumps,
 * so after a mutation (claim, verify, delete...) all visible lists refresh without prop drilling.
 */
const DataContext = createContext({ version: 0, invalidate: () => {} });

export function DataProvider({ children }) {
  const [version, setVersion] = useState(0);
  const invalidate = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, invalidate }), [version, invalidate]);
  return <DataContext value={value}>{children}</DataContext>;
}

export const useData = () => useContext(DataContext);
