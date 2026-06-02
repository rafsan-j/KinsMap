import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePersons, getPersonPhotoUrl } from '../hooks/usePersons'
import { fetchUnions } from '../hooks/useUnions'
import {
  BRANCH_FILTERS,
  GAME_MODES,
  MODE_CONFIG,
} from '../lib/flashcardUtils'
import FlashcardGame from '../components/flashcard/FlashcardGame'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

const MODE_LIST = [
  GAME_MODES.FACE_TO_NAME,
  GAME_MODES.CLUE_TO_PERSON,
  GAME_MODES.NAME_TO_RELATION,
  GAME_MODES.BIRTHDAY_CHALLENGE,
]

const BRANCH_LIST = [
  { id: BRANCH_FILTERS.ALL, label: 'All family members' },
  { id: BRANCH_FILTERS.MATERNAL, label: "Mother's side only" },
  { id: BRANCH_FILTERS.PATERNAL, label: "Father's side only" },
]

export default function FlashcardPage() {
  const { treeId, linkedPersonId } = useAuth()
  const { persons, loading: personsLoading, fetchPersons } = usePersons()

  const [unions, setUnions] = useState([])
  const [unionsLoading, setUnionsLoading] = useState(true)
  const [photoUrls, setPhotoUrls] = useState({})

  const [selectedMode, setSelectedMode] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState(BRANCH_FILTERS.ALL)
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    if (treeId) fetchPersons(treeId)
  }, [treeId, fetchPersons])

  useEffect(() => {
    if (!treeId) return

    let cancelled = false

    async function loadUnions() {
      setUnionsLoading(true)
      const { data } = await fetchUnions(treeId)
      if (!cancelled) {
        setUnions(data ?? [])
        setUnionsLoading(false)
      }
    }

    loadUnions()
    return () => {
      cancelled = true
    }
  }, [treeId])

  const personIdsWithPhotos = useMemo(
    () =>
      Object.values(persons)
        .filter((person) => person.profile_picture_url)
        .map((person) => person.id),
    [persons],
  )

  useEffect(() => {
    if (personIdsWithPhotos.length === 0) return

    let cancelled = false

    async function loadPhotos() {
      const entries = await Promise.all(
        personIdsWithPhotos.map(async (personId) => {
          const person = persons[personId]
          const { data } = await getPersonPhotoUrl(person.profile_picture_url)
          return [personId, data]
        }),
      )

      if (!cancelled) {
        setPhotoUrls(Object.fromEntries(entries))
      }
    }

    loadPhotos()
    return () => {
      cancelled = true
    }
  }, [personIdsWithPhotos, persons])

  const loading = personsLoading || unionsLoading

  const handleStart = () => {
    if (selectedMode) setGameStarted(true)
  }

  const handleChangeMode = () => {
    setGameStarted(false)
    setSelectedMode(null)
  }

  if (!linkedPersonId) {
    return (
      <p className="text-sm text-gray-600">
        Link your profile on the setup page before playing flashcards.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Family Flashcards</h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-10 w-10" />
          </div>
        ) : !gameStarted ? (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Choose a mode
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODE_LIST.map((modeId) => {
                  const config = MODE_CONFIG[modeId]
                  return (
                    <button
                      key={modeId}
                      type="button"
                      onClick={() => setSelectedMode(modeId)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        selectedMode === modeId
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <h3 className="font-semibold text-gray-900">{config.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{config.description}</p>
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Branch filter
              </h2>
              <div className="flex flex-wrap gap-2">
                {BRANCH_LIST.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => setSelectedBranch(branch.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      selectedBranch === branch.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {branch.label}
                  </button>
                ))}
              </div>
            </section>

            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!selectedMode}
              onClick={handleStart}
            >
              Start Game
            </Button>
          </div>
        ) : (
          <FlashcardGame
            mode={selectedMode}
            branchFilter={selectedBranch}
            persons={persons}
            unions={unions}
            rootPersonId={linkedPersonId}
            photoUrls={photoUrls}
            onChangeMode={handleChangeMode}
          />
        )}
    </div>
  )
}
