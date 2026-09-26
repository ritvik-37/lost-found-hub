import { Outlet, ScrollRestoration } from 'react-router';
import { ItemModalProvider } from '../../context/ItemModalContext.jsx';
import { BottomNav } from './BottomNav.jsx';
import { Header } from './Header.jsx';

export function Layout() {
  return (
    <ItemModalProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap">Lost &amp; Found Hub · Vision2Web Hackathon · Smart Campus &amp; Student Life</div>
      </footer>
      <BottomNav />
      <ScrollRestoration />
    </ItemModalProvider>
  );
}
