import { Navigate, useLocation } from 'react-router-dom'
import { AuthLoading } from './components/AuthLoading'
import { useAuth } from './context/AuthContext'
import { SyncProvider } from './context/SyncContext'
import AuthenticatedApp from './AuthenticatedApp'
import { LoginPage } from './pages/LoginPage'

export default function App() {
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const isLoginRoute =
    location.pathname === '/login' || location.pathname.endsWith('/login')

  if (isLoginRoute) {
    return <LoginPage />
  }

  if (authLoading) {
    return <AuthLoading />
  }

  if (!user) {
    const loginTarget = `/login${location.search}${location.hash}`
    return <Navigate to={loginTarget} replace />
  }

  return (
    <SyncProvider>
      <AuthenticatedApp />
    </SyncProvider>
  )
}
