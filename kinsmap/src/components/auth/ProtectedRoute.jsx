import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../ui/Spinner'

export default function ProtectedRoute({
  children,
  requireTree = true,
  allowedRoles = null,
}) {
  const { user, treeId, role, linkedPersonId, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireTree && !treeId) {
    return <Navigate to="/onboarding" replace />
  }

  if (
    requireTree &&
    treeId &&
    !linkedPersonId &&
    location.pathname !== '/invite/link-profile'
  ) {
    return <Navigate to="/invite/link-profile" replace />
  }

  if (allowedRoles?.length && !allowedRoles.includes(role)) {
    return <Navigate to="/tree" replace />
  }

  return children
}
