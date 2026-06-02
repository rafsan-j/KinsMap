import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePersons, getPersonPhotoUrl } from '../hooks/usePersons'
import { fetchUnions } from '../hooks/useUnions'
import { getUpcomingEvents } from '../lib/eventCalculator'
import EventCard from '../components/events/EventCard'
import PersonPanel from '../components/person/PersonPanel'
import Spinner from '../components/ui/Spinner'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'birthday', label: 'Birthdays 🎂' },
  { id: 'anniversary', label: 'Anniversaries 💍' },
  { id: 'memorial', label: 'Memorials 🕯' },
]

const WINDOWS = [
  { days: 30, label: '30 Days' },
  { days: 60, label: '60 Days' },
  { days: 90, label: '90 Days' },
]

function getFullName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown'
}

export default function EventsPage() {
  const { treeId, linkedPersonId } = useAuth()
  const navigate = useNavigate()
  const { persons, loading: personsLoading, fetchPersons } = usePersons()

  const [unions, setUnions] = useState([])
  const [unionsLoading, setUnionsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [daysAhead, setDaysAhead] = useState(60)
  const [photoUrls, setPhotoUrls] = useState({})

  const [panelPersonId, setPanelPersonId] = useState(null)
  const [anniversaryPartners, setAnniversaryPartners] = useState(null)

  useEffect(() => {
    if (!treeId) return
    fetchPersons(treeId)
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

  const allEvents = useMemo(
    () => getUpcomingEvents(persons, unions, daysAhead),
    [persons, unions, daysAhead],
  )

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents
    return allEvents.filter((event) => event.type === filter)
  }, [allEvents, filter])

  const personIdsForPhotos = useMemo(() => {
    const ids = new Set()
    for (const event of allEvents) {
      if (event.person?.id) ids.add(event.person.id)
      if (event.partner1?.id) ids.add(event.partner1.id)
      if (event.partner2?.id) ids.add(event.partner2.id)
    }
    return [...ids]
  }, [allEvents])

  useEffect(() => {
    if (personIdsForPhotos.length === 0) return

    let cancelled = false

    async function loadPhotos() {
      const entries = await Promise.all(
        personIdsForPhotos.map(async (personId) => {
          const person = persons[personId]
          if (!person?.profile_picture_url) return [personId, null]
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
  }, [personIdsForPhotos, persons])

  const handlePersonClick = (personId) => {
    setAnniversaryPartners(null)
    setPanelPersonId(personId)
  }

  const handleAnniversaryClick = (partner1Id, partner2Id) => {
    setAnniversaryPartners([partner1Id, partner2Id].filter(Boolean))
    setPanelPersonId(partner1Id ?? partner2Id)
  }

  const handleClosePanel = () => {
    setPanelPersonId(null)
    setAnniversaryPartners(null)
  }

  const loading = personsLoading || unionsLoading

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Upcoming Events</h1>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {WINDOWS.map((window) => (
            <button
              key={window.days}
              type="button"
              onClick={() => setDaysAhead(window.days)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                daysAhead === window.days
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {window.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-10 w-10" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-medium text-gray-700">
              No events in the next {daysAhead} days.
            </p>
            <p className="mt-2 text-sm text-gray-500">Enjoy the calm!</p>
          </div>
        ) : (
          <ul className="space-y-3 pb-8">
            {filteredEvents.map((event) => (
              <li
                key={
                  event.type === 'anniversary'
                    ? `anniversary-${event.union?.id}-${event.daysUntil}`
                    : `${event.type}-${event.person?.id}-${event.daysUntil}`
                }
              >
                <EventCard
                  event={event}
                  photoUrls={photoUrls}
                  onPersonClick={handlePersonClick}
                  onAnniversaryClick={handleAnniversaryClick}
                />
              </li>
            ))}
          </ul>
        )}

      {anniversaryPartners && anniversaryPartners.length > 1 && panelPersonId && (
        <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 gap-2 rounded-full bg-white px-3 py-2 shadow-lg ring-1 ring-gray-200">
          {anniversaryPartners.map((id) => {
            const person = persons[id]
            if (!person) return null
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPanelPersonId(id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  panelPersonId === id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {getFullName(person)}
              </button>
            )
          })}
        </div>
      )}

      <PersonPanel
        personId={panelPersonId}
        rootPersonId={linkedPersonId}
        onClose={handleClosePanel}
        onEdit={() => {}}
        onFocusInGraph={(id) => {
          handleClosePanel()
          navigate(`/tree/${id}`)
        }}
      />
    </div>
  )
}
