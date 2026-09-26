import { Check, CircleAlert, MapPin, PackageOpen, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ItemCard } from '../components/items/ItemCard.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { CardSkeletons } from '../components/ui/Skeleton.jsx';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { CAMPUS_NAME } from '../lib/constants.js';

const RECENT_QUERY = { type: 'FOUND', status: 'VERIFIED', limit: 4, sort: 'newest' };

const STEPS = [
  { title: 'Report', text: 'Post a lost or found item with a photo, location and date. Add a private detail only the owner would know.' },
  { title: 'Verify & match', text: 'An admin verifies the report. Our matcher suggests likely lost/found pairs by category, date and keywords.' },
  { title: 'Claim & return', text: 'Owners submit a claim with proof. Admin compares it against the private detail and approves the handover.' },
];

export function HomePage() {
  useDocumentTitle('');
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const summary = useApi('/api/items/summary');
  const recent = useApi('/api/items', { query: RECENT_QUERY });
  const week = summary.data?.week;
  const recentItems = recent.data?.items ?? [];

  function onSearch(e) {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/browse?q=${encodeURIComponent(term)}` : '/browse');
  }

  return (
    <div className="page">
      <section className="hero" aria-labelledby="home-heading">
        <div className="wrap hero-inner">
          <div>
            <span className="eyebrow">
              <MapPin className="icon-sm" aria-hidden="true" />
              {CAMPUS_NAME} · Lost &amp; Found
            </span>
            <h1 id="home-heading">Lost something on campus? Let&apos;s get it back to you.</h1>
            <p className="lead">
              Report lost or found items in under a minute. Admin-verified listings and a private proof check make sure items reach the
              right owner.
            </p>
            <form className="searchbar" role="search" onSubmit={onSearch}>
              <Search className="icon" aria-hidden="true" />
              <label htmlFor="hero-q" className="sr-only">
                Search items
              </label>
              <input
                className="input"
                id="hero-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search 'blue bottle', 'ID card', 'library'…"
                maxLength={100}
              />
              <button className="btn btn-primary" type="submit">
                Search
              </button>
            </form>
            <div className="cta-row">
              <Link className="btn btn-ghost" to="/report?type=LOST">
                <CircleAlert className="icon text-lost" aria-hidden="true" />I lost something
              </Link>
              <Link className="btn btn-accent" to="/report?type=FOUND">
                <Check className="icon" aria-hidden="true" />I found something
              </Link>
            </div>
          </div>

          <div className="card hero-panel" aria-busy={summary.loading}>
            <h3>This week on campus</h3>
            <div className="stat-row">
              {[
                ['found', 'Found'],
                ['lost', 'Lost'],
                ['returned', 'Returned'],
              ].map(([key, label]) => (
                <div className="stat" key={key}>
                  <strong>{week ? week[key] : '–'}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className="muted mt-4 mb-0 text-[.88rem]">Items are publicly visible only after an admin verifies the report.</p>
          </div>
        </div>
      </section>

      <section className="section pt-4" aria-labelledby="recent-heading">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2 id="recent-heading">Recently found</h2>
              <p className="muted m-0">Verified items waiting for their owners</p>
            </div>
            <Link className="btn btn-ghost btn-sm" to="/browse?type=FOUND">
              View all
            </Link>
          </div>
          <div className="grid-cards" aria-busy={recent.loading}>
            {recent.loading && !recent.data && <CardSkeletons count={4} />}
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
            {recent.error && !recent.data && (
              <div className="card col-span-full">
                <EmptyState
                  icon={CircleAlert}
                  title="Couldn't load recent items"
                  actions={
                    <button type="button" className="btn btn-primary" onClick={recent.reload}>
                      Try again
                    </button>
                  }
                >
                  {recent.error.message}
                </EmptyState>
              </div>
            )}
            {recent.data && !recentItems.length && (
              <div className="card col-span-full">
                <EmptyState
                  icon={PackageOpen}
                  title="No found items yet"
                  actions={
                    <Link className="btn btn-primary" to="/report?type=FOUND">
                      Report a found item
                    </Link>
                  }
                >
                  Picked something up on campus? Report it so the owner can find it here.
                </EmptyState>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="how-heading">
        <div className="wrap">
          <h2 id="how-heading" className="mb-5">
            How it works
          </h2>
          <ol className="steps m-0 list-none p-0">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card step">
                <div className="num" aria-hidden="true">
                  {i + 1}
                </div>
                <h3>{step.title}</h3>
                <p className="muted m-0">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
