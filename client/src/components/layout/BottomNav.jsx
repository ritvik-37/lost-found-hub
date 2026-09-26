import { CircleUser, House, List, Plus, Search, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';

/** Mobile navigation: max 5 items with the "Report" call-to-action in the centre. */
export function BottomNav() {
  const { isAdmin } = useAuth();
  return (
    <nav className="bottom-nav" aria-label="Mobile">
      <NavLink to="/" end>
        <House className="icon" aria-hidden="true" />
        Home
      </NavLink>
      <NavLink to="/browse">
        <Search className="icon" aria-hidden="true" />
        Browse
      </NavLink>
      <NavLink to="/report" className="fab-link" aria-label="Report an item">
        <span className="fab">
          <Plus className="icon" aria-hidden="true" />
        </span>
      </NavLink>
      <NavLink to="/activity">
        <List className="icon" aria-hidden="true" />
        Activity
      </NavLink>
      {isAdmin ? (
        <NavLink to="/admin">
          <ShieldCheck className="icon" aria-hidden="true" />
          Admin
        </NavLink>
      ) : (
        <NavLink to="/account">
          <CircleUser className="icon" aria-hidden="true" />
          Account
        </NavLink>
      )}
    </nav>
  );
}
