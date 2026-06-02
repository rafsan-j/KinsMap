import { Navigate } from 'react-router-dom'
import { useAuth, getAuthRedirectPath } from '../../hooks/useAuth'
import { useEffect, useState } from 'react'
import Spinner from '../ui/Spinner'

export default function PublicRoute({ children }) {
  const { user, isLoading } = useAuth()
  const [redirect, setRedirect] = useState(null)

  useEffect(() => {
    if (isLoading || !user) {
      setRedirect(null)
      return
    }

    getAuthRedirectPath(user.id).then(setRedirect)
  }, [user, isLoading])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (user && redirect) {
    return <Navigate to={redirect} replace />
  }

  return children
}
