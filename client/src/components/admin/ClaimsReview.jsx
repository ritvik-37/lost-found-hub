import { Check, CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useData } from '../../context/DataContext.jsx';
import { useItemModal } from '../../context/ItemModalContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import { Badge } from '../ui/Badge.jsx';
import { Loading } from '../ui/Skeleton.jsx';

export function ClaimsReview({ state }) {
  const confirm = useConfirm();
  const toast = useToast();
  const { invalidate } = useData();
  const { openItem } = useItemModal();
  const [remarks, setRemarks] = useState({});
  const [busyId, setBusyId] = useState(null);
  const claims = state.data?.claims ?? [];

  async function review(claim, decision) {
    if (
      decision === 'REJECTED' &&
      !(await confirm({
        title: 'Reject this claim?',
        message: `${claim.claimant.name} will see your remarks under My claims. They can submit a new claim with more detail.`,
        confirmLabel: 'Reject claim',
        tone: 'danger',
      }))
    ) {
      return;
    }
    setBusyId(claim.id);
    try {
      const adminRemarks = remarks[claim.id]?.trim();
      const json = await api(`/api/admin/claims/${claim.id}`, {
        method: 'PATCH',
        body: { status: decision, ...(adminRemarks ? { adminRemarks } : {}) },
      });
      toast(json.message);
      invalidate();
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="claims" className="card panel mb-5 scroll-mt-24" aria-labelledby="claims-heading">
      <div className="section-head mb-2">
        <h3 id="claims-heading" className="m-0">
          Claims to review
        </h3>
        {state.data && <Badge value="PENDING" label={`${state.data.total} pending`} />}
      </div>
      {state.loading && !state.data && <Loading label="Loading claims…" />}
      {state.error && !state.data && <p className="error">{state.error.message}</p>}
      {state.data && !claims.length && (
        <p className="muted mt-2 mb-0 flex items-center gap-2">
          <CircleCheck className="icon text-found" aria-hidden="true" />
          No claims waiting.
        </p>
      )}
      {claims.map((claim) => (
        <article key={claim.id} className="border-t border-border py-4" aria-labelledby={`claim-${claim.id}`}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id={`claim-${claim.id}`}
              className="link border-0 bg-transparent p-0 text-left"
              onClick={() => openItem(claim.item.id)}
            >
              {claim.item.title}
            </button>
            <Badge value={claim.item.type} />
            <span className="muted text-[.85rem]">
              claimed by {claim.claimant.name} ({claim.claimant.email})
            </span>
          </div>
          <div className="compare">
            <div>
              <b>Reporter&apos;s private detail</b>
              {claim.item.hiddenDetails}
            </div>
            <div>
              <b>Claimant&apos;s proof</b>
              {claim.proofAnswer}
            </div>
          </div>
          {claim.message && <p className="muted text-[.88rem]">&ldquo;{claim.message}&rdquo;</p>}
          <div className="field mb-2.5">
            <label htmlFor={`rm-${claim.id}`}>Remarks to claimant</label>
            <input
              className="input"
              id={`rm-${claim.id}`}
              maxLength={200}
              placeholder="e.g. Collect from Security Office, Admin Block, 10am–5pm"
              value={remarks[claim.id] ?? ''}
              onChange={(e) => setRemarks((r) => ({ ...r, [claim.id]: e.target.value }))}
            />
          </div>
          <div className="actions">
            <button type="button" className="btn btn-accent btn-sm" disabled={busyId === claim.id} onClick={() => review(claim, 'APPROVED')}>
              <Check className="icon-sm" aria-hidden="true" />
              Approve claim
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={busyId === claim.id} onClick={() => review(claim, 'REJECTED')}>
              Reject
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
