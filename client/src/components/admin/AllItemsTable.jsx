import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useData } from '../../context/DataContext.jsx';
import { useItemModal } from '../../context/ItemModalContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../lib/api.js';
import { formatDate, plural, titleCase } from '../../lib/format.js';
import { Badge } from '../ui/Badge.jsx';
import { Pager } from '../ui/Pager.jsx';
import { Loading } from '../ui/Skeleton.jsx';
import { useStatusMove } from './ReviewQueue.jsx';

const STATUSES = ['PENDING', 'VERIFIED', 'CLAIMED', 'CLOSED', 'REJECTED'];
const PAGE_SIZE = 20;

export function AllItemsTable() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const state = useApi('/api/admin/items', { query: { status, page, limit: PAGE_SIZE } });
  const { move, busyId } = useStatusMove();
  const { openItem } = useItemModal();
  const confirm = useConfirm();
  const toast = useToast();
  const { invalidate } = useData();
  const items = state.data?.items ?? [];

  async function remove(item) {
    const ok = await confirm({
      title: `Delete “${item.title}”?`,
      message: "This permanently removes the report, its photo and all of its claims. This can't be undone.",
      confirmLabel: 'Delete permanently',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const json = await api(`/api/items/${item.id}`, { method: 'DELETE' });
      toast(json.message);
      invalidate();
    } catch (err) {
      toast(err.message, 'err');
    }
  }

  return (
    <section id="all-items" className="card panel scroll-mt-24" aria-labelledby="all-heading">
      <div className="section-head mb-2">
        <div>
          <h3 id="all-heading" className="m-0">
            All items
          </h3>
          <p className="muted m-0 text-[.88rem]" aria-live="polite">
            {state.data ? plural(state.data.total, 'report') : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="admin-status" className="text-[.88rem] font-semibold">
            Status
          </label>
          <select
            id="admin-status"
            className="input w-auto min-h-10"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.loading && !state.data && <Loading label="Loading items…" />}
      {state.error && !state.data && <p className="error">{state.error.message}</p>}
      {state.data && !items.length && <p className="muted mb-0">No reports with this status.</p>}

      {items.length > 0 && (
        <div className="table-scroll" aria-busy={state.loading}>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
                <th scope="col">Move to</th>
                <th scope="col">
                  <span className="sr-only">Delete</span>
                </th>
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
                      {item.reportedBy?.name}
                      {item.pendingClaims > 0 && ` · ${plural(item.pendingClaims, 'pending claim')}`}
                    </div>
                  </td>
                  <td>
                    <Badge value={item.type} />
                  </td>
                  <td>
                    <Badge value={item.status} />
                  </td>
                  <td className="whitespace-nowrap">{formatDate(item.date)}</td>
                  <td>
                    <div className="actions">
                      {item.nextStatuses.length ? (
                        item.nextStatuses.map((to) => (
                          <button
                            key={to}
                            type="button"
                            className={to === 'REJECTED' ? 'btn btn-danger btn-sm' : 'btn btn-ghost btn-sm'}
                            disabled={busyId === item.id}
                            onClick={() => move(item, to)}
                            aria-label={`Move ${item.title} to ${titleCase(to)}`}
                          >
                            {titleCase(to)}
                          </button>
                        ))
                      ) : (
                        <span className="muted text-[.85rem]">Final</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button type="button" className="icon-btn h-9 w-9" onClick={() => remove(item)} aria-label={`Delete ${item.title}`} title="Delete">
                      <Trash2 className="icon-sm text-destructive" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={state.data?.pages} onChange={setPage} label="All items pages" />
    </section>
  );
}
