import { List, LogOut, Mail, Phone, Plus, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Badge } from '../components/ui/Badge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { formatLongDate, initials } from '../lib/format.js';

export function AccountPage() {
  useDocumentTitle('Account');
  const { user, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    toast('Signed out. See you soon!');
    navigate('/');
  }

  return (
    <div className="page section">
      <div className="wrap form-wrap-sm">
        <h2>Your account</h2>
        <div className="card form-card">
          <div className="mb-5 flex items-center gap-4">
            <span className="avatar h-14 w-14 text-lg" aria-hidden="true">
              {initials(user.name)}
            </span>
            <div>
              <h3 className="m-0">{user.name}</h3>
              <Badge value={isAdmin ? 'ADMIN' : 'VERIFIED'} label={isAdmin ? 'Admin' : 'Student'} />
            </div>
          </div>
          <dl className="facts mb-5">
            <dt className="flex items-center gap-1.5">
              <Mail className="icon-sm" aria-hidden="true" />
              Email
            </dt>
            <dd className="break-all">{user.email}</dd>
            <dt className="flex items-center gap-1.5">
              <Phone className="icon-sm" aria-hidden="true" />
              Phone
            </dt>
            <dd>{user.phone || <span className="muted font-normal">Not added</span>}</dd>
            <dt>Member since</dt>
            <dd>{formatLongDate(user.createdAt)}</dd>
          </dl>
          <div className="flex flex-col gap-2">
            {isAdmin && (
              <Link className="btn btn-primary" to="/admin">
                <ShieldCheck className="icon" aria-hidden="true" />
                Admin dashboard
              </Link>
            )}
            <Link className="btn btn-ghost" to="/activity">
              <List className="icon" aria-hidden="true" />
              My activity
            </Link>
            <Link className="btn btn-ghost" to="/report">
              <Plus className="icon" aria-hidden="true" />
              Report an item
            </Link>
            <button type="button" className="btn btn-danger" onClick={signOut}>
              <LogOut className="icon" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
