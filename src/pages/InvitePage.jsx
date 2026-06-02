import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { validateInviteToken, acceptInvite } from '../lib/invites'
import { useAuth } from '../hooks/useAuth'
import {
  clearPendingInvite,
  setPendingInvite,
} from '../lib/auth'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Administrator',
  contributor: 'Contributor',
  viewer: 'Viewer',
}

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, isLoading: authLoading, refreshMembership } = useAuth()

  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link.')
      setLoading(false)
      return
    }

    async function loadInvite() {
      setLoading(true)
      const { data, error: validateError } = await validateInviteToken(token)

      if (validateError || !data) {
        setError(
          validateError ||
            'This invite link is no longer valid. Ask the tree owner to send a new one.',
        )
        setInvite(null)
      } else {
        setInvite(data)
        setError('')
        if (!user) {
          setPendingInvite(token)
        }
      }

      setLoading(false)
    }

    loadInvite()
  }, [token, user])

  const handleAccept = async () => {
    if (!token || !user) return

    setAccepting(true)
    setError('')

    const { error: acceptError } = await acceptInvite(token)

    if (acceptError) {
      setAccepting(false)
      setError(acceptError)
      return
    }

    clearPendingInvite()
    await refreshMembership()
    navigate('/invite/link-profile', { replace: true })
  }

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (error && !invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Invalid Invite</h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
          {user ? (
            <Link
              to="/onboarding"
              className="mt-6 inline-block text-sm font-medium text-indigo-600"
            >
              Go to onboarding
            </Link>
          ) : (
            <Link
              to="/login"
              className="mt-6 inline-block text-sm font-medium text-indigo-600"
            >
              Go to login
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="text-2xl font-bold text-indigo-700">
            KinsMap
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <p className="text-sm text-gray-600">You&apos;ve been invited to join</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{invite.treeName}</h1>
            <p className="mt-2 text-sm text-gray-600">
              as a{' '}
              <Badge variant="primary" className="inline-flex">
                {ROLE_LABELS[invite.role] ?? invite.role}
              </Badge>
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {user ? (
            <Button
              className="mt-6 w-full"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? 'Joining…' : 'Accept Invite'}
            </Button>
          ) : (
            <div className="mt-6 space-y-3 text-center">
              <p className="text-sm text-gray-600">
                Sign in or create an account to accept this invitation.
              </p>
              <Link to="/login">
                <Button className="w-full">Sign in to accept</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
