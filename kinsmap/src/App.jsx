import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth, getAuthRedirectPath } from './hooks/useAuth'
import ProtectedRoute from './components/auth/ProtectedRoute'
import PublicRoute from './components/auth/PublicRoute'
import OnboardingRoute from './components/auth/OnboardingRoute'
import ProtectedLayout from './components/layout/ProtectedLayout'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import TreePage from './pages/TreePage'
import InvitePage from './pages/InvitePage'
import LinkProfilePage from './pages/LinkProfilePage'
import SettingsPage from './pages/SettingsPage'
import EventsPage from './pages/EventsPage'
import FlashcardPage from './pages/FlashcardPage'
import ArchivePage from './pages/ArchivePage'
import Spinner from './components/ui/Spinner'
import { useEffect, useState } from 'react'

function HomeRedirect() {
  const { user, isLoading } = useAuth()
  const [target, setTarget] = useState(null)

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      setTarget('/login')
      return
    }

    getAuthRedirectPath(user.id).then(setTarget)
  }, [user, isLoading])

  if (isLoading || (user && !target)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  return <Navigate to={target ?? '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          <Route path="/invite/:token" element={<InvitePage />} />

          <Route
            path="/onboarding"
            element={
              <OnboardingRoute>
                <OnboardingPage />
              </OnboardingRoute>
            }
          />

          <Route
            path="/invite/link-profile"
            element={
              <ProtectedRoute requireTree>
                <LinkProfilePage />
              </ProtectedRoute>
            }
          />

          <Route element={<ProtectedLayout requireTree />}>
            <Route path="/tree" element={<TreePage />} />
            <Route path="/tree/:focusPersonId" element={<TreePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/flashcard" element={<FlashcardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route
            element={
              <ProtectedLayout requireTree allowedRoles={['owner', 'admin']} />
            }
          >
            <Route path="/archive" element={<ArchivePage />} />
          </Route>

          <Route path="/invite/setup" element={<Navigate to="/onboarding" replace />} />
          <Route path="/link-profile" element={<Navigate to="/invite/link-profile" replace />} />
          <Route path="/flashcards" element={<Navigate to="/flashcard" replace />} />
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
