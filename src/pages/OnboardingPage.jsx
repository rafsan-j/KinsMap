import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createTreeWithOwnerProfile } from '../lib/onboarding'
import {
  extractInviteToken,
  getPendingInvite,
  setPendingInvite,
} from '../lib/auth'
import { validateInviteToken } from '../lib/invites'
import PersonForm from '../components/person/PersonForm'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

function getDisplayName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'You'
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, setAuth } = useAuth()

  const [mode, setMode] = useState(null)
  const [createStep, setCreateStep] = useState(1)
  const [treeName, setTreeName] = useState('')
  const [relationshipContext, setRelationshipContext] = useState('')
  const [profileDraft, setProfileDraft] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const [inviteInput, setInviteInput] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const pending = getPendingInvite()
    if (pending) {
      setInviteInput(pending)
    }
  }, [])

  const handleJoinInvite = async (event) => {
    event?.preventDefault()
    setError('')

    const token = extractInviteToken(inviteInput)
    if (!token) {
      setError('Enter a valid invite code or link.')
      return
    }

    setJoining(true)

    const { data, error: validateError } = await validateInviteToken(token)
    if (validateError || !data) {
      setJoining(false)
      setError(validateError || 'This invite link is no longer valid.')
      return
    }

    setPendingInvite(token)
    setJoining(false)
    navigate(`/invite/${token}`, { replace: true })
  }

  const handleProfileCollected = (personRow) => {
    setProfileDraft(personRow)
    setCreateStep(3)
    setError('')
  }

  const handleCreateTree = async () => {
    if (!user?.id || !treeName.trim() || !profileDraft) return

    setCreating(true)
    setError('')

    try {
      const { data, error } = await createTreeWithOwnerProfile({
        treeName: treeName.trim(),
        personRow: profileDraft,
      })

      if (error || !data?.tree_id || !data?.person_id) {
        throw new Error(error || 'Failed to create your family tree.')
      }

      setAuth(user, data.tree_id, 'owner', data.person_id)
      navigate('/tree', { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to create your family tree.')
      setCreating(false)
    }
  }

  if (mode === 'create') {
    return (
      <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-indigo-700">KinsMap</h1>
            <p className="mt-2 text-sm text-gray-600">Create your family tree</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {createStep === 1 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900">Name your family tree</h2>
              <p className="mt-1 text-sm text-gray-600">
                Choose a name your family will recognize.
              </p>

              <form
                className="mt-6 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!treeName.trim()) {
                    setError('Tree name is required.')
                    return
                  }
                  setError('')
                  setCreateStep(2)
                }}
              >
                <Input
                  label="Tree name"
                  value={treeName}
                  onChange={(event) => setTreeName(event.target.value)}
                  placeholder='e.g. "The Rahman Family"'
                  required
                  autoFocus
                />
                <Input
                  label="Your relationship to this tree (optional)"
                  value={relationshipContext}
                  onChange={(event) => setRelationshipContext(event.target.value)}
                  placeholder="e.g. I am starting this tree for my side of the family"
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMode(null)
                      setCreateStep(1)
                      setError('')
                    }}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Continue
                  </Button>
                </div>
              </form>
            </div>
          )}

          {createStep === 2 && (
            <PersonForm
              mode="add"
              embedded
              deferSave
              maxStep={3}
              showCancel={false}
              heading="Create your profile"
              description="This is your personal profile in the tree."
              submitLabel="Continue"
              onSuccess={handleProfileCollected}
              onClose={() => setCreateStep(1)}
            />
          )}

          {createStep === 3 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="text-4xl">🎉</div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">
                Your family tree is ready!
              </h2>
              <p className="mt-3 text-sm text-gray-600">
                <span className="font-medium text-gray-900">{treeName}</span>
                {' · '}
                {getDisplayName(profileDraft)}
              </p>
              <Button
                className="mt-8 w-full"
                onClick={handleCreateTree}
                disabled={creating}
              >
                {creating ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Setting up…
                  </span>
                ) : (
                  'Open My Tree'
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => setCreateStep(2)}
                disabled={creating}
              >
                Edit profile
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-indigo-50 via-white to-gray-50 px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-indigo-700">KinsMap</h1>
          <p className="mt-2 text-sm text-gray-600">Welcome! How would you like to get started?</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMode('create')
              setError('')
            }}
            className="rounded-2xl border border-gray-200 bg-white p-8 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="text-4xl">🌳</div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              Create a New Family Tree
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Start your family tree. You&apos;ll be the owner and administrator.
            </p>
          </button>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-4xl">🔗</div>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              Join with an Invite Link
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Someone invited you? Enter your invite code or paste the full link.
            </p>

            <form onSubmit={handleJoinInvite} className="mt-6 space-y-4">
              <Input
                label="Invite code or link"
                value={inviteInput}
                onChange={(event) => setInviteInput(event.target.value)}
                placeholder="Paste invite link or token…"
              />
              <Button type="submit" className="w-full" disabled={joining}>
                {joining ? 'Checking…' : 'Join Tree'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
