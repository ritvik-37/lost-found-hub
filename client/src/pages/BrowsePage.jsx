import { CircleAlert, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ItemCard } from '../components/items/ItemCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Pager } from '../components/ui/Pager.jsx';
import { CardSkeletons } from '../components/ui/Skeleton.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { CATEGORIES, LOCATIONS, PUBLIC_STATUSES } from '../lib/constants.js';
import { cx, plural, titleCase, todayISO } from '../lib/format.js';

const PAGE_SIZE = 12;
const FILTER_KEYS = ['q', 'type', 'category', 'location', 'status', 'dateFrom', 'dateTo', 'sort', 'page'];
const TYPES = [
  ['', 'All'],
  ['LOST', 'Lost'],
  ['FOUND', 'Found'],
];

export function BrowsePage() {
  useDocumentTitle('Browse items');
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));
  const page = Math.max(1, Number(f.page) || 1);
  const [keyword, setKeyword] = useState(f.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef(null);

  /** Update URL filters (so results are shareable and survive refresh). Changing a filter resets the page. */
  function update(changes) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(changes)) {
          if (!value || (key === 'sort' && value === 'newest') || (key === 'page' && value === 1)) next.delete(key);
          else next.set(key, String(value));
        }
        if (!('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  // Debounced keyword search (250ms, like the prototype).
  useEffect(() => {
    if (keyword.trim() === f.q) return undefined;
    const t = setTimeout(() => update({ q: keyword.trim() }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // Keep the input in sync when the URL changes from elsewhere (e.g. "Clear filters").
  useEffect(() => setKeyword((k) => (k.trim() === f.q ? k : f.q)), [f.q]);

  const query = { ...Object.fromEntries(FILTER_KEYS.filter((k) => f[k]).map((k) => [k, f[k]])), page, limit: PAGE_SIZE };
  const { data, loading, error, reload } = useApi('/api/items', { query });
  const items = data?.items ?? [];
  const activeCount = ['type', 'category', 'location', 'status', 'dateFrom', 'dateTo'].filter((k) => f[k]).length;

  function clearFilters() {
    setKeyword('');
    setParams(
      (prev) => {
        const next = new URLSearchParams();
        if (prev.get('item')) next.set('item', prev.get('item'));
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  function goToPage(n) {
    update({ page: n });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  let countText = 'Loading items…';
  if (error && !data) countText = 'Could not load items';
  else if (data) countText = `${plural(data.total, 'item')} found`;

  return (
    <div className="page section">
      <div className="wrap">
        <h2>Browse items</h2>
        <p className="muted">Only admin-verified reports are shown.</p>
        <div className="browse-layout">
          <aside className="card filters" aria-label="Filters">
            <div className="field">
              <label htmlFor="q">Search</label>
              <input
                className="input"
                id="q"
                type="search"
                placeholder="Keyword…"
                value={keyword}
                maxLength={100}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-block min-[900px]:hidden"
              aria-expanded={filtersOpen}
              aria-controls="filter-body"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal className="icon" aria-hidden="true" />
              {filtersOpen ? 'Hide filters' : 'More filters'}
              {activeCount > 0 && <span className="count-pill">{activeCount} active</span>}
            </button>

            <div id="filter-body" className={cx(!filtersOpen && 'max-[899px]:hidden', 'max-[899px]:mt-4')}>
              <div className="field">
                <span className="legend" id="type-label">
                  Type
                </span>
                <div className="seg" role="group" aria-labelledby="type-label">
                  {TYPES.map(([value, label]) => (
                    <button key={label} type="button" aria-pressed={f.type === value} onClick={() => update({ type: value })}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span className="legend" id="cat-label">
                  Category
                </span>
                <div className="chips" role="group" aria-labelledby="cat-label">
                  {['', ...CATEGORIES].map((c) => (
                    <button key={c || 'all'} type="button" className="chip" aria-pressed={f.category === c} onClick={() => update({ category: c })}>
                      {c || 'All'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label htmlFor="locF">Location</label>
                <select className="input" id="locF" value={f.location} onChange={(e) => update({ location: e.target.value })}>
                  <option value="">All locations</option>
                  {LOCATIONS.map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="statusF">Status</label>
                <select className="input" id="statusF" value={f.status} onChange={(e) => update({ status: e.target.value })}>
                  <option value="">Any public status</option>
                  {PUBLIC_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {titleCase(s)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="dateFrom">From date</label>
                <input
                  className="input"
                  id="dateFrom"
                  type="date"
                  max={f.dateTo || todayISO()}
                  value={f.dateFrom}
                  onChange={(e) => update({ dateFrom: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="dateTo">To date</label>
                <input
                  className="input"
                  id="dateTo"
                  type="date"
                  min={f.dateFrom || undefined}
                  max={todayISO()}
                  value={f.dateTo}
                  onChange={(e) => update({ dateTo: e.target.value })}
                />
              </div>

              <button className="btn btn-ghost btn-block" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          </aside>

          <div ref={resultsRef} className="scroll-mt-24">
            <div className="results-bar">
              <p className="muted m-0" aria-live="polite">
                {countText}
              </p>
              <label className="sr-only" htmlFor="sortF">
                Sort
              </label>
              <select className="input w-auto min-h-10" id="sortF" value={f.sort || 'newest'} onChange={(e) => update({ sort: e.target.value })}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>

            <div className="grid-cards" aria-busy={loading}>
              {loading && !data && <CardSkeletons count={6} />}
              {items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
              {error && !data && (
                <div className="card col-span-full">
                  <EmptyState
                    icon={CircleAlert}
                    title="Couldn't load items"
                    actions={
                      <button type="button" className="btn btn-primary" onClick={reload}>
                        Try again
                      </button>
                    }
                  >
                    {error.message}
                  </EmptyState>
                </div>
              )}
              {data && !items.length && (
                <div className="card col-span-full">
                  <EmptyState
                    icon={Search}
                    title="No items match these filters"
                    actions={
                      <>
                        <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                          Clear filters
                        </button>
                        <Link className="btn btn-primary" to="/report?type=LOST">
                          Report lost item
                        </Link>
                      </>
                    }
                  >
                    Try a broader keyword or clear the filters. Still missing? Report it so finders can reach you.
                  </EmptyState>
                </div>
              )}
            </div>
            <Pager page={page} pages={data?.pages} onChange={goToPage} label="Results pages" />
          </div>
        </div>
      </div>
    </div>
  );
}
