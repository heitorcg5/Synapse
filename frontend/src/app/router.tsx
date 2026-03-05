import { Navigate, useRoutes } from 'react-router-dom'
import { useAuth } from './auth-context'
import { Layout } from '@/shared/components/Layout'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { DashboardPage } from '@/features/content/pages/DashboardPage'
import { UploadContentPage } from '@/features/content/pages/UploadContentPage'
import { ContentDetailsPage } from '@/features/content/pages/ContentDetailsPage'
import { SummaryViewPage } from '@/features/content/pages/SummaryViewPage'

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
      element: isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />,
    },
    {
      path: '/register',
      element: isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <DashboardPage /> },
        { path: 'upload', element: <UploadContentPage /> },
        { path: 'content/:id', element: <ContentDetailsPage /> },
        { path: 'content/:id/summary', element: <SummaryViewPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ])
  return routes
}
