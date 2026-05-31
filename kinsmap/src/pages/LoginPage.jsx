import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth, getAuthRedirectPath } from '../hooks/useAuth'
import {
  extractInviteToken,
  getPendingInvite,
  PENDING_INVITE_KEY,
} from '../lib/auth'
import { validateInviteToken } from '../lib/invites'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

function mapAuthError(message) {
  const lower = (message ?? '').toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return 'Wrong email or password. Please try again.'
  }
  if (lower.includes('user already registered')) {
    return 'This email is already in use. Try logging in instead.'
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters.'
  }
  if (lower.includes('unable to validate email')) {
    return 'Please enter a valid email address.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }

  return message || 'Something went wrong. Please try again.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { refreshMembership } = useAuth()

  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)

  const pendingInvite = getPendingInvite()

  const finishAuth = async (userId) => {
    await refreshMembership()
    const path = await getAuthRedirectPath(userId)
    navigate(path, { replace: true })
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setSubmitting(false)

    if (signInError) {
      setError(mapAuthError(signInError.message))
      return
    }

    if (data.user) {
      await finishAuth(data.user.id)
    }
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSubmitting(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    setSubmitting(false)

    if (signUpError) {
      setError(mapAuthError(signUpError.message))
      return
    }

    if (data.session && data.user) {
      await finishAuth(data.user.id)
      return
    }

    setError(
      'Check your email to confirm your account, then sign in to continue.',
    )
  }

  const handleMagicLink = async (event) => {
    event.preventDefault()
    setError('')
    setMagicLinkSent(false)
    setSubmitting(true)

    const redirectTo = pendingInvite
      ? `${window.location.origin}/invite/${pendingInvite}`
      : `${window.location.origin}/`

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })

    setSubmitting(false)

    if (otpError) {
      setError(mapAuthError(otpError.message))
      return
    }

    setMagicLinkSent(true)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-indigo-700">KinsMap</h1>
          <p className="mt-2 text-sm text-gray-600">Your private family tree</p>
        </div>

        {pendingInvite && (
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            Sign in or create an account to accept your family tree invitation.
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {!showMagicLink ? (
            <>
              <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login')
                    setError('')
                  }}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    tab === 'login'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signup')
                    setError('')
                  }}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    tab === 'signup'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form
                onSubmit={tab === 'login' ? handleLogin : handleSignup}
                className="space-y-4"
              >
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                  placeholder={tab === 'signup' ? 'At least 6 characters' : ''}
                />
                {tab === 'signup' && (
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                  />
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? 'Please wait…'
                    : tab === 'login'
                      ? 'Log In'
                      : 'Create Account'}
                </Button>
              </form>

              <div className="mt-6 border-t border-gray-100 pt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowMagicLink(true)
                    setError('')
                    setMagicLinkSent(false)
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Sign in with Magic Link
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Magic Link</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowMagicLink(false)
                    setError('')
                    setMagicLinkSent(false)
                  }}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Back
                </button>
              </div>

              {magicLinkSent && (
                <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Check your email for a sign-in link.
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleMagicLink} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
                <p className="text-xs text-gray-500">
                  We&apos;ll email you a secure link — no password needed.
                </p>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send Magic Link'}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          KinsMap is private and invitation-only. Only people you invite can see
          your family tree.
        </p>
      </div>
    </div>
  )
}
