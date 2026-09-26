import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { Loading } from '../ui/Skeleton.jsx';

/** Sends signed-out visitors to /login and brings them back afterwards. */
export function RequireAuth({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return (
      <div className="wrap section">
        <Loading label="Checking your session…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location, reason: 'auth' }} />;
  return children;
}
