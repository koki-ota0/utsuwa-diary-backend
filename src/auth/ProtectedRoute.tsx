import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './AuthContext'

type ProtectedRouteProps = {
  redirectPath?: string
}

export function ProtectedRoute({ redirectPath = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div>Checking authentication...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace state={{ from: location }} />
  }

  return <Outlet />
}
