import { CircleAlert, Package, Pencil, Search, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ItemThumb } from '../components/items/ItemThumb.jsx';
import { StatusTimeline } from '../components/items/StatusTimeline.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { RowSkeletons } from '../components/ui/Skeleton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useData } from '../context/DataContext.jsx';
import { useItemModal } from '../context/ItemModalContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/format.js';

const TABS = [
  { id: 'reports', label: 'My reports' },
  { id: 'claims', label: 'My claims' },
];

export function ActivityPage() {
  useDocumentTitle('My activity');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'claims' ? 'claims' : 'reports';
  const reports = useApi('/api/items/mine');
  const claims = useApi('/api/claims/mine');
  const tabRefs = useRef({});

  const counts = { reports: reports.data?.items.length, claims: claims.data?.claims.length };

  function selectTab(id, focus = false) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === 'reports') next.delete('tab');
        else next.set('tab', id);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
    if (focus) tabRefs.current[id]?.focus();
  }

  // WAI-ARIA tabs: arrow keys move between tabs, Home/End jump to the ends.
  function onTabKeyDown(e) {
    const i = TABS.findIndex((t) => t.id === tab);
    const moves = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    selectTab(TABS[(moves[e.key] + TABS.length) % TABS.length].id, true);
  }

  return (
    <div className="page section">
      <div className="wrap">
        <h2>My activity</h2>
        <p className="muted">
          Signed in as <strong>{user.name}</strong>
        </p>
        <div className="tabs" role="tablist" aria-label="My activity">
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => (tabRefs.current[t.id] = el)}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-controls={`panel-${t.id}`}
              aria-selected={tab === t.id}
              tabIndex={tab === t.id ? 0 : -1}
              className="tab"
              onClick={() => selectTab(t.id)}
              onKeyDown={onTabKeyDown}
            >
              {t.label}
              {counts[t.id] !== undefined && <span className="count-pill">{counts[t.id]}</span>}
            </button>
          ))}
        </div>
        <div className="card" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
          {tab === 'reports' ? <ReportsPanel state={reports} /> : <ClaimsPanel state={claims} />}
        </div>
      </div>
    </div>
  );
}

function LoadError({ error, onRetry }) {
  return (
    <EmptyState
      icon={CircleAlert}
      title="Couldn't load your activity"
      actions={
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      }
    >
      {error.message}
    </EmptyState>
  );
}

function ReportsPanel({ state }) {
  const { openItem } = useItemModal();
  const confirm = useConfirm();
  const toast = useToast();
  const { invalidate } = useData();
  const [busyId, setBusyId] = useState(null);

  if (state.loading && !state.data) return <RowSkeletons />;
  if (state.error && !state.data) return <LoadError error={state.error} onRetry={state.reload} />;
  const items = state.data.items;
  if (!items.length) {
    return (
      <EmptyState
        icon={Package}
        title="No reports yet"
        actions={
          <Link className="btn btn-primary" to="/report">
            Report an item
          </Link>
        }
      >
        Lost or found something? Reporting takes under a minute.
      </EmptyState>
    );
  }

  async function remove(item) {
    const ok = await confirm({
      title: 'Delete this report?',
      message: `"${item.title}" and any claims on it will be removed. This can't be undone.`,
      confirmLabel: 'Delete report',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      const json = await api(`/api/items/${item.id}`, { method: 'DELETE' });
      toast(json.message);
      invalidate();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusyId(null);
    }
  }

  return items.map((item) => (
    <div className="list-row" key={item.id}>
      <ItemThumb item={item} variant="mini" />
      <div className="list-main">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong>{item.title}</strong>
          <Badge value={item.type} />
        </div>
        <div className="muted text-[.85rem]">
          {item.location} · {formatDate(item.date)}
        </div>
        <StatusTimeline status={item.status} note={item.statusNote} />
      </div>
      <div className="row-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openItem(item.id)}>
          View
        </button>
        {item.status === 'PENDING' && (
          <Link className="btn btn-ghost btn-sm" to={`/report/${item.id}/edit`} aria-label={`Edit ${item.title}`}>
            <Pencil className="icon-sm" aria-hidden="true" />
            Edit
          </Link>
        )}
        {!['CLAIMED', 'CLOSED'].includes(item.status) && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => remove(item)}
            disabled={busyId === item.id}
            aria-label={`Delete ${item.title}`}
          >
            <Trash2 className="icon-sm" aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
    </div>
  ));
}

function ClaimsPanel({ state }) {
  const { openItem } = useItemModal();
  if (state.loading && !state.data) return <RowSkeletons />;
  if (state.error && !state.data) return <LoadError error={state.error} onRetry={state.reload} />;
  const claims = state.data.claims;
  if (!claims.length) {
    return (
      <EmptyState
        icon={Search}
        title="No claims yet"
        actions={
          <Link className="btn btn-primary" to="/browse">
            Browse items
          </Link>
        }
      >
        Found your item in the listings? Open it and tap &quot;This is mine&quot;.
      </EmptyState>
    );
  }
  return claims.map((claim) => (
    <div className="list-row" key={claim.id}>
      <ItemThumb item={claim.item} variant="mini" />
      <div className="list-main">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong>{claim.item.title}</strong>
          <Badge value={claim.status} />
        </div>
        <div className="muted text-[.85rem]">Your proof: &ldquo;{claim.proofAnswer}&rdquo;</div>
        {claim.adminRemarks && (
          <div className="mt-1 text-[.85rem]">
            <strong>Admin:</strong> {claim.adminRemarks}
          </div>
        )}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openItem(claim.item.id)}>
        View item
      </button>
    </div>
  ));
}
