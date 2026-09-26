import { Check, CircleAlert, Lock, Package, RotateCcw, ShieldCheck, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { AllItemsTable } from '../components/admin/AllItemsTable.jsx';
import { CategoryChart, LostFoundDonut, WeekChart } from '../components/admin/Charts.jsx';
import { ClaimsReview } from '../components/admin/ClaimsReview.jsx';
import { ReviewQueue } from '../components/admin/ReviewQueue.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Loading, Skeleton } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const PENDING_ITEMS = { status: 'PENDING', limit: 100, sort: 'oldest' };
const PENDING_CLAIMS = { status: 'PENDING', limit: 100 };

export default function AdminPage() {
  useDocumentTitle('Admin dashboard');
  const { user, ready, isAdmin } = useAuth();

  return (
    <div className="page section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>Admin dashboard</h2>
            <p className="muted m-0">Review reports, verify claims, and track activity</p>
          </div>
          {ready && isAdmin && <ResetDemoButton />}
        </div>
        {!ready && <Loading />}
        {ready && !isAdmin && <AdminsOnly signedIn={Boolean(user)} />}
        {ready && isAdmin && <Dashboard />}
      </div>
    </div>
  );
}

/**
 * Restores the original demo data (shown only when the server has demo sign-in on).
 * Handy right before judging, or after visitors have changed things on the public demo.
 */
function ResetDemoButton() {
  const demo = useApi('/api/auth/demo');
  const { demoLogin } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!demo.data?.accounts?.length) return null;

  async function reset() {
    const ok = await confirm({
      title: 'Reset all demo data?',
      message:
        'Every report, claim, photo and account created since the last reset is deleted, and the original demo data comes back. Everyone is signed out.',
      confirmLabel: 'Reset demo data',
      tone: 'danger',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const json = await api('/api/admin/demo/reset', { method: 'POST' });
      await demoLogin('admin'); // the admin account was recreated, so sign back in
      toast(json.message.replace('Everyone was signed out.', 'You are signed in as the demo admin.'));
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={busy}>
      <RotateCcw className={busy ? 'icon-sm spin' : 'icon-sm'} aria-hidden="true" />
      {busy ? 'Resetting…' : 'Reset demo data'}
    </button>
  );
}

/** Non-admins get a clear explanation instead of a blank page. */
function AdminsOnly({ signedIn }) {
  const location = useLocation();
  return (
    <div className="card locked">
      <EmptyState
        icon={Lock}
        title="Admins only"
        actions={
          signedIn ? (
            <Link className="btn btn-primary" to="/">
              Go to home
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/login" state={{ from: location }}>
              Sign in as admin
            </Link>
          )
        }
      >
        {signedIn
          ? "This area is restricted to campus admins. You're signed in with a student account."
          : 'This area is restricted to campus admins. Sign in with an admin account to continue.'}
      </EmptyState>
    </div>
  );
}

function Dashboard() {
  const stats = useApi('/api/admin/stats');
  const pending = useApi('/api/admin/items', { query: PENDING_ITEMS });
  const claims = useApi('/api/admin/claims', { query: PENDING_CLAIMS });
  const s = stats.data;

  const kpis = s
    ? [
        ['Total reports', s.totals.total, Package],
        ['Pending review', s.totals.PENDING, CircleAlert],
        ['Verified', s.totals.VERIFIED, ShieldCheck],
        ['Claimed', s.totals.CLAIMED, User],
        ['Closed', s.totals.CLOSED, Check],
      ]
    : [];

  return (
    <>
      <nav className="admin-nav" aria-label="Dashboard sections">
        <a className="chip no-underline" href="#overview">
          Overview
        </a>
        <a className="chip no-underline" href="#review">
          Review queue{pending.data ? ` (${pending.data.total})` : ''}
        </a>
        <a className="chip no-underline" href="#claims">
          Claims{claims.data ? ` (${claims.data.total})` : ''}
        </a>
        <a className="chip no-underline" href="#all-items">
          All items
        </a>
      </nav>

      <section id="overview" className="scroll-mt-24" aria-label="Overview">
        {stats.error && !s && (
          <div className="alert" role="alert">
            <CircleAlert className="icon" aria-hidden="true" />
            <span>
              Couldn&apos;t load statistics: {stats.error.message}{' '}
              <button type="button" className="link border-0 bg-transparent p-0" onClick={stats.reload}>
                Try again
              </button>
            </span>
          </div>
        )}

        <div className="kpis">
          {s
            ? kpis.map(([label, value, Icon]) => (
                <div className="card kpi" key={label}>
                  <div className="k-label">
                    <Icon className="icon" aria-hidden="true" />
                    {label}
                  </div>
                  <div className="k-val">{value}</div>
                </div>
              ))
            : Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[92px] rounded-card" />)}
        </div>

        <div className="admin-grid">
          <div className="card panel">
            <h3>Reports by category</h3>
            {s ? <CategoryChart data={s.byCategory} /> : <Skeleton className="h-[264px]" />}
          </div>
          <div className="grid gap-4">
            <div className="card panel">
              <h3>Lost vs found</h3>
              {s ? <LostFoundDonut lost={s.byType.LOST} found={s.byType.FOUND} /> : <Skeleton className="h-[130px]" />}
            </div>
            <div className="card panel">
              <h3>Reports, last 7 days</h3>
              {s ? <WeekChart days={s.last7Days} /> : <Skeleton className="h-[170px]" />}
            </div>
          </div>
        </div>
      </section>

      <ReviewQueue state={pending} />
      <ClaimsReview state={claims} />
      <AllItemsTable />
    </>
  );
}
