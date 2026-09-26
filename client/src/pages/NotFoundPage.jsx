import { CircleAlert, MapPinOff } from 'lucide-react';
import { Link, useRouteError } from 'react-router';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="page section">
      <div className="wrap">
        <div className="card">
          <EmptyState
            icon={MapPinOff}
            title="This page wandered off"
            headingLevel={2}
            actions={
              <>
                <Link className="btn btn-ghost" to="/browse">
                  Browse items
                </Link>
                <Link className="btn btn-primary" to="/">
                  Go home
                </Link>
              </>
            }
          >
            We couldn&apos;t find that page. It may have moved, or the link is mistyped.
          </EmptyState>
        </div>
      </div>
    </div>
  );
}

/** Shown if a page crashes while rendering, instead of a blank screen. */
export function RouteErrorPage() {
  const error = useRouteError();
  console.error(error);
  return (
    <main className="section" id="main">
      <div className="wrap">
        <div className="card">
          <EmptyState
            icon={CircleAlert}
            title="Something went wrong"
            headingLevel={1}
            actions={
              <a className="btn btn-primary" href="/">
                Reload the app
              </a>
            }
          >
            An unexpected error stopped this page from loading. Reloading usually fixes it.
          </EmptyState>
        </div>
      </div>
    </main>
  );
}
