import { Check, CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useData } from '../../context/DataContext.jsx';
import { useItemModal } from '../../context/ItemModalContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { formatDate } from '../../lib/format.js';
import { Badge } from '../ui/Badge.jsx';
import { Loading } from '../ui/Skeleton.jsx';

/** Shared by the review queue and the all-items table: PATCH a status, confirming irreversible moves. */
export function useStatusMove() {
  const confirm = useConfirm();
  const toast = useToast();
  const { invalidate } = useData();
  const [busyId, setBusyId] = useState(null);

  const CONFIRM = {
    REJECTED: (t) => ({
      title: `Reject “${t}”?`,
      message: "The report stays hidden from everyone except its reporter. Rejected is a final status and can't be undone.",
      confirmLabel: 'Reject report',
      tone: 'danger',
    }),
    CLOSED: (t) => ({
      title: `Close “${t}”?`,
      message: "Closed means returned or resolved. It's a final status, and any pending claims will be rejected.",
      confirmLabel: 'Close item',
      tone: 'danger',
    }),
    CLAIMED: (t) => ({
      title: `Mark “${t}” as claimed?`,
      message: 'Use this when the item was handed over outside the app. Any pending claims will be rejected.',
      confirmLabel: 'Mark claimed',
    }),
  };

  async function move(item, to) {
    if (CONFIRM[to] && !(await confirm(CONFIRM[to](item.title)))) return;
    setBusyId(item.id);
    try {
      const json = await api(`/api/admin/items/${item.id}/status`, { method: 'PATCH', body: { status: to } });
      const n = json.data.autoRejectedClaims;
      toast(n ? `${json.message} ${n} pending claim${n === 1 ? ' was' : 's were'} rejected.` : json.message);
      invalidate();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusyId(null);
    }
  }

  return { move, busyId };
}

export function ReviewQueue({ state }) {
  const { move, busyId } = useStatusMove();
  const { openItem } = useItemModal();
  const items = state.data?.items ?? [];

  return (
    <section id="review" className="card panel mb-5 scroll-mt-24" aria-labelledby="review-heading">
      <div className="section-head mb-2">
        <h3 id="review-heading" className="m-0">
          Review queue
        </h3>
        {state.data && <Badge value="PENDING" label={`${state.data.total} pending`} />}
      </div>
      {state.loading && !state.data && <Loading label="Loading pending reports…" />}
      {state.error && !state.data && <p className="error">{state.error.message}</p>}
      {state.data && !items.length && (
        <p className="muted mt-2 mb-0 flex items-center gap-2">
          <CircleCheck className="icon text-found" aria-hidden="true" />
          All caught up — no reports waiting for review.
        </p>
      )}
      {items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Type</th>
                <th scope="col">Location</th>
                <th scope="col">Reported by</th>
                <th scope="col">Private detail</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <button type="button" className="link border-0 bg-transparent p-0 text-left" onClick={() => openItem(item.id)}>
                      {item.title}
                    </button>
                    <div className="muted text-[.8rem]">
                      {item.category} · {formatDate(item.date)}
                    </div>
                  </td>
                  <td>
                    <Badge value={item.type} />
                  </td>
                  <td>{item.location}</td>
                  <td>
                    {item.reportedBy?.name}
                    <div className="muted text-[.8rem]">{item.reportedBy?.email}</div>
                  </td>
                  <td>{item.hiddenDetails}</td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn btn-accent btn-sm"
                        disabled={busyId === item.id}
                        onClick={() => move(item, 'VERIFIED')}
                        aria-label={`Verify ${item.title}`}
                      >
                        <Check className="icon-sm" aria-hidden="true" />
                        Verify
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyId === item.id}
                        onClick={() => move(item, 'REJECTED')}
                        aria-label={`Reject ${item.title}`}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
