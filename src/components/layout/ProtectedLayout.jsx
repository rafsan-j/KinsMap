import { Outlet } from 'react-router-dom'
import ProtectedRoute from '../auth/ProtectedRoute'
import AppLayout from './AppLayout'

export default function ProtectedLayout({ requireTree = false, allowedRoles = null }) {
  return (
    <ProtectedRoute requireTree={requireTree} allowedRoles={allowedRoles}>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  )
}
