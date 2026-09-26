import { useLocation } from 'react-router';

/** Where to go after signing in: back to where the user came from (including an open item modal). */
export function useReturnTo() {
  const location = useLocation();
  const from = location.state?.from;
  return from ? `${from.pathname}${from.search ?? ''}` : null;
}
