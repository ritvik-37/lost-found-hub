import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Layout } from './components/layout/Layout.jsx';
import { RequireAuth } from './components/layout/RequireAuth.jsx';
import { Loading } from './components/ui/Skeleton.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { AccountPage } from './pages/AccountPage.jsx';
import { ActivityPage } from './pages/ActivityPage.jsx';
import { BrowsePage } from './pages/BrowsePage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotFoundPage, RouteErrorPage } from './pages/NotFoundPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ReportPage } from './pages/ReportPage.jsx';

// The dashboard pulls in Recharts, so it's split into its own chunk.
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));

const adminFallback = (
  <div className="wrap section">
    <Loading label="Loading dashboard…" />
  </div>
);

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'browse', element: <BrowsePage /> },
      { path: 'report', element: <RequireAuth><ReportPage /></RequireAuth> },
      { path: 'report/:id/edit', element: <RequireAuth><ReportPage /></RequireAuth> },
      { path: 'activity', element: <RequireAuth><ActivityPage /></RequireAuth> },
      { path: 'account', element: <RequireAuth><AccountPage /></RequireAuth> },
      { path: 'admin', element: <Suspense fallback={adminFallback}><AdminPage /></Suspense> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </DataProvider>
  );
}
