import { Navigate, useRoutes } from 'react-router-dom'
import { useAuth } from './auth-context'
import { Layout } from '@/shared/components/Layout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { DashboardPage } from '@/features/content/pages/DashboardPage'
import { UploadContentPage } from '@/features/content/pages/UploadContentPage'
import { ContentDetailsPage } from '@/features/content/pages/ContentDetailsPage'
import { SummaryViewPage } from '@/features/content/pages/SummaryViewPage'
import { InboxPage } from '@/features/brain/pages/InboxPage'
import { KnowledgePage } from '@/features/brain/pages/KnowledgePage'
import { KnowledgeDetailPage } from '@/features/brain/pages/KnowledgeDetailPage'
import { KnowledgeGraphPage } from '@/features/brain/pages/KnowledgeGraphPage'
import { ProfilePage } from '@/features/profile/pages/ProfilePage'
import { PreferencesPage } from '@/features/profile/pages/PreferencesPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function AppRouter() {
  const { isAuthenticated } = useAuth()
  const routes = useRoutes([
    {
      path: '/login',
      element: isAuthenticated ? <Navigate to="/inbox" replace /> : <LoginPage />,
    },
    {
      path: '/register',
      element: isAuthenticated ? <Navigate to="/inbox" replace /> : <RegisterPage />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Navigate to="/inbox" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'inbox', element: <InboxPage /> },
        { path: 'knowledge', element: <KnowledgePage /> },
        { path: 'knowledge/graph', element: <KnowledgeGraphPage /> },
        { path: 'knowledge/:id', element: <KnowledgeDetailPage /> },
        { path: 'profile', element: <ProfilePage /> },
        { path: 'preferences', element: <PreferencesPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'settings/ai', element: <Navigate to="/settings" replace /> },
        { path: 'settings/knowledge', element: <Navigate to="/settings" replace /> },
        { path: 'upload', element: <UploadContentPage /> },
        { path: 'inbox/:id', element: <ContentDetailsPage /> },
        { path: 'content/:id/summary', element: <SummaryViewPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ])
  return routes
}
