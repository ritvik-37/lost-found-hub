import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pager({ page, pages, onChange, label = 'Pagination' }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav className="pager" aria-label={label}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="icon-sm" aria-hidden="true" />
        Previous
      </button>
      <span className="muted text-sm" aria-live="polite">
        Page {page} of {pages}
      </span>
      <button type="button" className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
        <ChevronRight className="icon-sm" aria-hidden="true" />
      </button>
    </nav>
  );
}
