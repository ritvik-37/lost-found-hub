import { House, List, LogOut, Plus, Search, ShieldCheck } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { firstName, initials } from '../../lib/format.js';
import { ThemeToggle } from './ThemeToggle.jsx';

export function Header() {
  const { user, ready, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    toast('Signed out. See you soon!');
    navigate('/');
  }

  const links = [
    { to: '/', label: 'Home', icon: House, end: true },
    { to: '/browse', label: 'Browse', icon: Search },
    { to: '/report', label: 'Report', icon: Plus },
    { to: '/activity', label: 'My Activity', icon: List },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <header className="topbar">
      <div className="wrap">
        <Link to="/" className="brand" aria-label="Lost & Found Hub home">
          <span className="brand-mark">
            <Search className="icon" aria-hidden="true" />
          </span>
          <span className="hidden min-[340px]:inline">Lost&nbsp;&amp;&nbsp;Found Hub</span>
        </Link>

        <nav className="nav-links" aria-label="Main">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon className="icon" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="top-actions">
          {ready && user && (
            <>
              <Link to="/account" className="user-pill" aria-label={`Your account: ${user.name}, ${isAdmin ? 'admin' : 'student'}`}>
                <span className="avatar" aria-hidden="true">
                  {initials(user.name)}
                </span>
                <span className="hidden flex-col leading-tight sm:flex" aria-hidden="true">
                  <span className="text-[.88rem] font-semibold">{firstName(user.name)}</span>
                  <span className="role-tag">{isAdmin ? 'Admin' : 'Student'}</span>
                </span>
              </Link>
              <button type="button" className="icon-btn hidden sm:grid" onClick={signOut} aria-label="Sign out" title="Sign out">
                <LogOut className="icon" aria-hidden="true" />
              </button>
            </>
          )}
          {ready && !user && (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm hidden sm:inline-flex">
                Sign up
              </Link>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
