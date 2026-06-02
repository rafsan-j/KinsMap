import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, ChevronDown, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { usePersons } from '../../hooks/usePersons'
import { fetchUnions } from '../../hooks/useUnions'
import { getUpcomingEvents } from '../../lib/eventCalculator'
import { searchPersonsByName } from '../../lib/invites'

function getDisplayName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown'
}

function getUserInitials(user) {
  const email = user?.email ?? ''
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

export default function Topbar() {
  const navigate = useNavigate()
  const { currentUser, treeId, linkedPersonId, userRole, signOut } = useAuth()
  const { persons, fetchPersons } = usePersons()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [unions, setUnions] = useState([])
  const searchRef = useRef(null)

  useEffect(() => {
    if (treeId) fetchPersons(treeId)
  }, [treeId, fetchPersons])

  useEffect(() => {
    if (!treeId) return

    fetchUnions(treeId).then(({ data }) => setUnions(data ?? []))
  }, [treeId])

  useEffect(() => {
    if (!treeId || !query.trim()) {
      setResults([])
      return undefined
    }

    const timer = setTimeout(async () => {
      const { data } = await searchPersonsByName(treeId, query)
      setResults(data ?? [])
    }, 250)

    return () => clearTimeout(timer)
  }, [query, treeId])

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const eventCount = useMemo(
    () => getUpcomingEvents(persons, unions, 7).length,
    [persons, unions],
  )

  const canAccessSettings = userRole === 'owner' || userRole === 'admin'

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <Link to="/tree" className="shrink-0 text-lg font-bold text-indigo-700">
          KinsMap
        </Link>

        <div ref={searchRef} className="relative mx-auto hidden w-full max-w-md flex-1 sm:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search family by name…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {searchOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {results.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">No matches found</p>
              ) : (
                results.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    className="flex w-full px-4 py-2.5 text-left text-sm hover:bg-indigo-50"
                    onClick={() => {
                      setQuery('')
                      setSearchOpen(false)
                      navigate(`/tree/${person.id}`)
                    }}
                  >
                    {getDisplayName(person)}
                    {person.nickname && (
                      <span className="ml-2 text-gray-400">&ldquo;{person.nickname}&rdquo;</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            to="/events"
            className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            aria-label={`${eventCount} upcoming events`}
          >
            <Bell className="h-5 w-5" />
            {eventCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {eventCount > 9 ? '9+' : eventCount}
              </span>
            )}
          </Link>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 hover:bg-gray-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {getUserInitials(currentUser)}
                </span>
                <ChevronDown className="hidden h-4 w-4 text-gray-500 sm:block" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[180px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
                sideOffset={6}
                align="end"
              >
                {linkedPersonId && (
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none hover:bg-gray-100"
                    onSelect={() => navigate(`/tree/${linkedPersonId}`)}
                  >
                    Profile
                  </DropdownMenu.Item>
                )}
                {canAccessSettings && (
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-md px-3 py-2 text-sm outline-none hover:bg-gray-100"
                    onSelect={() => navigate('/settings')}
                  >
                    Settings
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item
                  className="cursor-pointer rounded-md px-3 py-2 text-sm text-red-600 outline-none hover:bg-red-50"
                  onSelect={async () => {
                    await signOut()
                    navigate('/login')
                  }}
                >
                  Logout
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 pb-3 sm:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search family…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
          />
          {searchOpen && query.trim() && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-indigo-50"
                  onClick={() => {
                    setQuery('')
                    setSearchOpen(false)
                    navigate(`/tree/${person.id}`)
                  }}
                >
                  {getDisplayName(person)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
