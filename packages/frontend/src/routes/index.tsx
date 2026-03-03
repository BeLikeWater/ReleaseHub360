import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Layout from '@/components/layout/Layout';

// Public
import LoginPage from '@/pages/LoginPage';

// Protected pages (lazy-loaded stubs)
import HomeDashboardPage from '@/pages/HomeDashboardPage';
import ReleaseHealthCheckPage from '@/pages/ReleaseHealthCheckPage';
import ProductCatalogPage from '@/pages/product-catalog';
import ReleaseCalendarPage from '@/pages/ReleaseCalendarPage';
import ReleasesPage from '@/pages/ReleasesPage';
import ReleaseNotesPage from '@/pages/ReleaseNotesPage';
import HotfixMerkeziPage from '@/pages/HotfixMerkeziPage';
import CustomerManagementPage from '@/pages/customer-management';
import CustomerDashboardPage from '@/pages/CustomerDashboardPage';
import CustomerProductVersionsPage from '@/pages/CustomerProductVersionsPage';
import CodeSyncPage from '@/pages/CodeSyncPage';
import ServiceVersionMatrixPage from '@/pages/ServiceVersionMatrixPage';
import ChangeTrackingPage from '@/pages/ChangeTrackingPage';
import PipelineStatusPage from '@/pages/PipelineStatusPage';
import UrgentChangesPage from '@/pages/UrgentChangesPage';
import ReleaseTodosPage from '@/pages/ReleaseTodosPage';
import ReportIssuePage from '@/pages/ReportIssuePage';
import NotificationsPage from '@/pages/NotificationsPage';
import UsersRolesPage from '@/pages/UsersRolesPage';
import SettingsPage from '@/pages/SettingsPage';
import WorkflowHistoryPage from '@/pages/WorkflowHistoryPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeDashboardPage /> },
      { path: 'release-health-check', element: <ReleaseHealthCheckPage /> },
      { path: 'product-catalog', element: <ProductCatalogPage /> },
      { path: 'release-calendar', element: <ReleaseCalendarPage /> },
      { path: 'releases', element: <ReleasesPage /> },
      { path: 'release-notes', element: <ReleaseNotesPage /> },
      { path: 'hotfix-merkezi', element: <HotfixMerkeziPage /> },
      { path: 'customer-management', element: <CustomerManagementPage /> },
      { path: 'customer-dashboard', element: <CustomerDashboardPage /> },
      { path: 'customers/:id', element: <CustomerDashboardPage /> },
      { path: 'customers/:id/dashboard', element: <CustomerDashboardPage /> },
      { path: 'customers/:id/products/:productId', element: <CustomerProductVersionsPage /> },
      { path: 'code-sync', element: <CodeSyncPage /> },
      { path: 'service-version-matrix', element: <ServiceVersionMatrixPage /> },
      { path: 'change-tracking', element: <ChangeTrackingPage /> },
      { path: 'pipeline-status', element: <PipelineStatusPage /> },
      { path: 'urgent-changes', element: <UrgentChangesPage /> },
      { path: 'release-todos', element: <ReleaseTodosPage /> },
      { path: 'report-issue', element: <ReportIssuePage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'users-roles', element: <UsersRolesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'workflow-history', element: <WorkflowHistoryPage /> },
    ],
  },
]);
