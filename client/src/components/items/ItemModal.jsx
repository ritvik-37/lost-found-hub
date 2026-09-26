import { Check, Lock, Pencil, SearchX, Sparkles, User } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { useItemModal } from '../../context/ItemModalContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatDate, formatLongDate } from '../../lib/format.js';
import { Badge } from '../ui/Badge.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Modal } from '../ui/Modal.jsx';
import { Loading, Skeleton } from '../ui/Skeleton.jsx';
import { ClaimForm } from './ClaimForm.jsx';
import { ItemThumb } from './ItemThumb.jsx';

export function ItemModal({ id, onClose }) {
  const { data, error, loading } = useApi(`/api/items/${id}`, { keepPrevious: false });
  const item = data?.item;

  let title = 'Loading item…';
  if (item) title = item.title;
  else if (error) title = 'Item unavailable';

  return (
    <Modal title={title} onClose={onClose}>
      {loading && !item && <DetailSkeleton />}
      {error && !item && (
        <EmptyState
          icon={SearchX}
          title={error.status === 404 ? "This item isn't available" : 'Could not load this item'}
          actions={
            <Link className="btn btn-primary" to="/browse" onClick={onClose}>
              Browse items
            </Link>
          }
        >
          {error.status === 404 ? 'It may be awaiting review, or it was removed by its reporter.' : error.message}
        </EmptyState>
      )}
      {item && <ItemDetail item={item} viewer={data.viewer} onClose={onClose} />}
    </Modal>
  );
}

function DetailSkeleton() {
  return (
    <div className="detail-grid" aria-hidden="true">
      <Skeleton className="aspect-[4/3]" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-16" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}

function ItemDetail({ item, viewer, onClose }) {
  return (
    <>
      <div className="detail-grid">
        <ItemThumb item={item} variant="detail" />
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge value={item.type} />
            <Badge value={item.status} />
          </div>
          <p>{item.description}</p>
          <dl className="facts">
            <dt>Category</dt>
            <dd>{item.category}</dd>
            <dt>Location</dt>
            <dd>
              {item.location}
              {item.exactSpot && <span className="muted font-normal"> · {item.exactSpot}</span>}
            </dd>
            <dt>{item.type === 'LOST' ? 'Date lost' : 'Date found'}</dt>
            <dd>{formatLongDate(item.date)}</dd>
            <dt>Reported by</dt>
            <dd>{viewer.isOwner ? 'You' : (item.reportedBy?.name ?? 'A student')}</dd>
          </dl>
        </div>
      </div>

      {['PENDING', 'VERIFIED'].includes(item.status) && <MatchList item={item} />}

      <div className="mt-5">
        <ItemActions item={item} viewer={viewer} onClose={onClose} />
      </div>
    </>
  );
}

function MatchList({ item }) {
  const { openItem } = useItemModal();
  const { data, loading } = useApi(`/api/items/${item.id}/matches`, { keepPrevious: false });
  const matches = data?.matches ?? [];

  if (loading && !data) return <Loading label="Looking for possible matches…" className="mt-5 text-sm" />;
  if (!matches.length) return null;

  return (
    <section className="matches" aria-labelledby="matches-heading">
      <h4 id="matches-heading" className="flex items-center gap-1.5">
        <Sparkles className="icon" aria-hidden="true" />
        Possible {item.type === 'LOST' ? 'found' : 'lost'} matches
      </h4>
      {matches.map(({ item: match, score, reasons }) => (
        <button
          key={match.id}
          type="button"
          className="match"
          onClick={() => openItem(match.id, { replace: true })}
          aria-label={`${match.title}, ${score}% match: ${reasons.join(', ')}`}
        >
          <ItemThumb item={match} variant="mini" />
          <div className="min-w-0">
            <strong>{match.title}</strong>
            <div className="muted text-[.84rem]">
              {match.location} · {formatDate(match.date)}
            </div>
            <div className="muted text-[.78rem]">{reasons.join(' · ')}</div>
          </div>
          <span className="score">{score}% match</span>
        </button>
      ))}
    </section>
  );
}

function PrivateDetail({ title, text, note }) {
  return (
    <div className="private-box">
      <Lock className="icon" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <div>{text}</div>
        {note && <div className="muted text-[.85rem]">{note}</div>}
      </div>
    </div>
  );
}

function ItemActions({ item, viewer, onClose }) {
  const location = useLocation();
  const { myClaim } = viewer;

  if (viewer.isAdmin) {
    return <PrivateDetail title="Private detail (admin only)" text={item.hiddenDetails} />;
  }

  if (viewer.isOwner) {
    return (
      <>
        <PrivateDetail title="Your private detail" text={item.hiddenDetails} note="Only you and campus admins can see this." />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="muted m-0 flex items-center gap-2">
            <User className="icon" aria-hidden="true" />
            You reported this item.
          </p>
          {item.status === 'PENDING' && (
            <Link className="btn btn-ghost btn-sm" to={`/report/${item.id}/edit`} onClick={onClose}>
              <Pencil className="icon-sm" aria-hidden="true" />
              Edit report
            </Link>
          )}
        </div>
      </>
    );
  }

  if (myClaim && myClaim.status !== 'REJECTED') {
    return (
      <div className="card flex flex-col gap-1 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Check className="icon text-found" aria-hidden="true" />
          Your claim is <Badge value={myClaim.status} />
        </div>
        {myClaim.adminRemarks && (
          <p className="m-0 text-[.9rem]">
            <strong>Admin:</strong> {myClaim.adminRemarks}
          </p>
        )}
      </div>
    );
  }

  if (viewer.canClaim) {
    return (
      <>
        {myClaim?.status === 'REJECTED' && (
          <div className="alert alert-info" role="note">
            <span>
              Your earlier claim was rejected{myClaim.adminRemarks ? `: "${myClaim.adminRemarks}"` : '.'} You can try again with more
              detail.
            </span>
          </div>
        )}
        <ClaimForm item={item} onDone={onClose} />
      </>
    );
  }

  if (!viewer.signedIn && item.status === 'VERIFIED') {
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="m-0">{item.type === 'FOUND' ? 'Is this yours?' : 'Found this item?'} Sign in to submit a claim with proof.</p>
        <Link className="btn btn-primary" to="/login" state={{ from: location }}>
          Sign in to claim
        </Link>
      </div>
    );
  }

  if (item.status !== 'VERIFIED') {
    return <p className="muted m-0">This item is {item.status.toLowerCase()} and can no longer be claimed.</p>;
  }
  return null;
}
