import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePersons } from '../hooks/usePersons'
import { searchPersonsByName, linkMemberPerson, fetchTreeMembers } from '../lib/invites'
import { supabase } from '../lib/supabase'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import PersonForm from '../components/person/PersonForm'

function getDisplayName(person) {
  return [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Unknown'
}

function PersonAvatar({ person }) {
  const photoUrl = useMemo(() => {
    if (!person.profile_picture_url) return null
    const { data } = supabase.storage
      .from('person-photos')
      .getPublicUrl(person.profile_picture_url)
    return data.publicUrl
  }, [person.profile_picture_url])

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className="h-10 w-10 rounded-full object-cover"
      />
    )
  }

  const initial = (person.first_name?.[0] ?? person.last_name?.[0] ?? '?').toUpperCase()
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
      {initial}
    </div>
  )
}

export default function LinkProfilePage() {
  const navigate = useNavigate()
  const { user, treeId, linkedPersonId, refreshMembership } = useAuth()
  const { fetchPersons } = usePersons()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [memberId, setMemberId] = useState(null)
  const [error, setError] = useState('')
  const [linking, setLinking] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if (linkedPersonId) {
      navigate('/tree', { replace: true })
    }
  }, [linkedPersonId, navigate])

  useEffect(() => {
    if (!treeId || !user?.id) return

    async function loadMember() {
      const { data } = await fetchTreeMembers(treeId)
      const row = data?.find((member) => member.user_id === user.id)
      if (row) setMemberId(row.id)
    }

    loadMember()
    fetchPersons(treeId)
  }, [treeId, user?.id, fetchPersons])

  useEffect(() => {
    if (!treeId || !query.trim()) {
      setResults([])
      return undefined
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const { data, error: searchError } = await searchPersonsByName(treeId, query)
      if (searchError) setError(searchError)
      else {
        setResults(data ?? [])
        setError('')
      }
      setSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, treeId])

  const handleLinkPerson = async (personId) => {
    if (!memberId) {
      setError('Membership record not found.')
      return
    }

    setLinking(true)
    setError('')

    const { error: linkError } = await linkMemberPerson(memberId, personId)
    setLinking(false)

    if (linkError) {
      setError(linkError)
      return
    }

    await refreshMembership()
    navigate('/tree', { replace: true })
  }

  const handlePersonCreated = async (person) => {
    await handleLinkPerson(person.id)
  }

  if (!treeId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">No tree found</h1>
          <p className="mt-3 text-sm text-gray-600">
            Accept an invitation or create a family tree to continue.
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate('/onboarding')}>
            Go to onboarding
          </Button>
        </div>
      </div>
    )
  }

  if (showCreateForm) {
    return (
      <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-xl">
          <PersonForm
            mode="add"
            treeId={treeId}
            maxStep={3}
            embedded
            heading="Create your profile"
            description="Add yourself as a new person in the tree."
            submitLabel="Save & continue"
            onClose={() => setShowCreateForm(false)}
            onSuccess={handlePersonCreated}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            One last step — find yourself in the tree
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Search for your name so relatives know who you are.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <Input
            label="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type your first or last name…"
            autoFocus
          />

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 space-y-2">
            {searching && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}

            {!searching && query.trim() && results.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500">No matches found.</p>
            )}

            {results.map((person) => (
              <button
                key={person.id}
                type="button"
                disabled={linking}
                onClick={() => handleLinkPerson(person.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-50"
              >
                <PersonAvatar person={person} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{getDisplayName(person)}</p>
                  {person.nickname && (
                    <p className="text-xs text-gray-500">&ldquo;{person.nickname}&rdquo;</p>
                  )}
                  {person.birth_date && (
                    <p className="text-xs text-gray-500">Born {person.birth_date}</p>
                  )}
                </div>
                {person.gender && person.gender !== 'unspecified' && (
                  <Badge variant="muted">{person.gender}</Badge>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <Button
              variant="secondary"
              type="button"
              className="w-full"
              onClick={() => setShowCreateForm(true)}
            >
              I don&apos;t see myself yet
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
