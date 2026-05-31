import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import ProtectedRoute from './ProtectedRoute'
import Spinner from '../ui/Spinner'

function OnboardingGuard({ children }) {
  const { treeId, linkedPersonId, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (treeId && linkedPersonId) {
    return <Navigate to="/tree" replace />
  }

  if (treeId && !linkedPersonId) {
    return <Navigate to="/invite/link-profile" replace />
  }

  return children
}

export default function OnboardingRoute({ children }) {
  return (
    <ProtectedRoute requireTree={false}>
      <OnboardingGuard>{children}</OnboardingGuard>
    </ProtectedRoute>
  )
}
