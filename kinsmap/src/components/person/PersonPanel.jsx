import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, differenceInYears, parseISO, isValid } from 'date-fns'
import { X, ChevronDown, ChevronUp, Focus, Pencil, Users } from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'
import { usePersons, getPersonPhotoUrl } from '../../hooks/usePersons'
import { fetchUnions } from '../../hooks/useUnions'
import { computeRelationship } from '../../lib/relationshipEngine'
import { OCCUPATION_CONFIG } from '../../lib/occupationConfig'
import { EDUCATION_LEVELS } from '../../lib/educationConfig'
import { getChildren, getSiblings } from '../graph/graphLayout'

const OCCUPATION_LABELS = {
  student: 'Student',
  professional: 'Professional',
  business: 'Business',
  homemaker: 'Homemaker',
  retired: 'Retired',
  unemployed: 'Unemployed',
  child: 'Child',
}

const UNION_STATUS_LABELS = {
  active: 'Active',
  divorced: 'Divorced',
  widowed: 'Widowed',
  separated: 'Separated',
}

function parseDate(value) {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

function formatPersonDate(dateString, approximate = false) {
  const date = parseDate(dateString)
  if (!date) return null
  if (approximate) return `~${format(date, 'yyyy')}`
  return format(date, 'd MMMM yyyy')
}

function computeAge(birthDateString, endDateString = null) {
  const birth = parseDate(birthDateString)
  if (!birth) return null
  const end = endDateString ? parseDate(endDateString) : new Date()
  if (!end) return null
  return differenceInYears(end, birth)
}

function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0) ?? ''
  const last = lastName?.charAt(0) ?? ''
  return (first + last).toUpperCase() || '?'
}

function getFullName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown'
}

function getOccupationFieldLabel(category, key) {
  const fields = OCCUPATION_CONFIG[category] ?? []
  const field = fields.find((item) => item.key === key)
  if (field) return field.label
  return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatOccupationValue(category, key, value) {
  const fields = OCCUPATION_CONFIG[category] ?? []
  const field = fields.find((item) => item.key === key)
  if (field?.type === 'select' && field.options) {
    const option = field.options.find((item) => item.value === value)
    return option?.label ?? value
  }
  return String(value)
}

function formatEducationYears(entry) {
  if (entry.is_ongoing) {
    return entry.start_year ? `${entry.start_year} – present` : 'Ongoing'
  }
  if (entry.start_year && entry.end_year) return `${entry.start_year} – ${entry.end_year}`
  if (entry.start_year) return `${entry.start_year}`
  if (entry.end_year) return `${entry.end_year}`
  return null
}

function getSpouseEntries(personId, unions, persons) {
  return unions
    .filter(
      (union) =>
        !union.is_deleted &&
        (union.partner_1_id === personId || union.partner_2_id === personId),
    )
    .map((union) => {
      const spouseId =
        union.partner_1_id === personId ? union.partner_2_id : union.partner_1_id
      return {
        union,
        spouse: persons[spouseId] ?? null,
      }
    })
    .filter((entry) => entry.spouse)
}

function Section({ title, children }) {
  if (!children) return null
  return (
    <section className="border-t border-gray-100 px-4 py-4 sm:px-6">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      {children}
    </section>
  )
}

function DetailRow({ label, value, children }) {
  if (!value && !children) return null
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm font-medium text-gray-500 sm:w-28">{label}</dt>
      <dd className="text-sm text-gray-900">{children ?? value}</dd>
    </div>
  )
}

function MiniPersonButton({ person, photoUrl, onClick }) {
  if (!person) return null

  return (
    <button
      type="button"
      onClick={() => onClick?.(person.id)}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitials(person.first_name, person.last_name)
        )}
      </div>
      <span className="truncate text-sm font-medium text-gray-900">
        {getFullName(person)}
      </span>
    </button>
  )
}

export default function PersonPanel({
  personId,
  rootPersonId,
  onClose,
  onEdit,
  onFocusInGraph,
}) {
  const { persons, fetchPerson, fetchPersons, getPersonById } = usePersons()
  const [loading, setLoading] = useState(false)
  const [unions, setUnions] = useState([])
  const [photoUrl, setPhotoUrl] = useState(null)
  const [relatedPhotoUrls, setRelatedPhotoUrls] = useState({})
  const [showFamily, setShowFamily] = useState(false)
  const [addressExpanded, setAddressExpanded] = useState(false)

  const person = personId ? getPersonById(personId) : null

  useEffect(() => {
    if (!personId) return

    let cancelled = false

    async function loadPerson() {
      if (getPersonById(personId)) return

      setLoading(true)
      const { data } = await fetchPerson(personId)
      if (!cancelled && data?.tree_id) {
        await fetchPersons(data.tree_id)
      }
      if (!cancelled) setLoading(false)
    }

    loadPerson()
    return () => {
      cancelled = true
    }
  }, [personId, fetchPerson, fetchPersons, getPersonById])

  useEffect(() => {
    if (!person?.tree_id) return

    let cancelled = false

    async function loadTreeData() {
      await fetchPersons(person.tree_id)
      const { data } = await fetchUnions(person.tree_id)
      if (!cancelled && data) setUnions(data)
    }

    loadTreeData()
    return () => {
      cancelled = true
    }
  }, [person?.tree_id, fetchPersons])

  useEffect(() => {
    if (!person?.profile_picture_url) {
      setPhotoUrl(null)
      return
    }

    let cancelled = false

    async function loadPhoto() {
      const { data } = await getPersonPhotoUrl(person.profile_picture_url)
      if (!cancelled) setPhotoUrl(data)
    }

    loadPhoto()
    return () => {
      cancelled = true
    }
  }, [person?.profile_picture_url])

  const familyIds = useMemo(() => {
    if (!person) return []

    const ids = new Set()
    if (person.father_id) ids.add(person.father_id)
    if (person.mother_id) ids.add(person.mother_id)

    for (const child of getChildren(persons, person.id)) ids.add(child.id)
    for (const sibling of getSiblings(persons, person)) ids.add(sibling.id)
    for (const { spouse } of getSpouseEntries(person.id, unions, persons)) {
      ids.add(spouse.id)
    }

    return [...ids]
  }, [person, persons, unions])

  useEffect(() => {
    if (familyIds.length === 0) return

    let cancelled = false

    async function loadRelatedPhotos() {
      const entries = await Promise.all(
        familyIds.map(async (id) => {
          const related = persons[id]
          if (!related?.profile_picture_url) return [id, null]
          const { data } = await getPersonPhotoUrl(related.profile_picture_url)
          return [id, data]
        }),
      )

      if (!cancelled) {
        setRelatedPhotoUrls(Object.fromEntries(entries))
      }
    }

    loadRelatedPhotos()
    return () => {
      cancelled = true
    }
  }, [familyIds, persons])

  useEffect(() => {
    if (!personId) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [personId, onClose])

  useEffect(() => {
    if (!personId) {
      setShowFamily(false)
      setAddressExpanded(false)
    }
  }, [personId])

  const relationship = useMemo(() => {
    if (!person || !rootPersonId) return null
    return computeRelationship(persons, unions, rootPersonId, person.id)
  }, [person, persons, unions, rootPersonId])

  const occupationEntries = useMemo(() => {
    const occupation = person?.current_occupation
    if (!occupation?.category) return []

    const { category, ...fields } = occupation
    return Object.entries(fields)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({
        key,
        label: getOccupationFieldLabel(category, key),
        value: formatOccupationValue(category, key, value),
      }))
  }, [person?.current_occupation])

  const educationEntries = useMemo(() => {
    if (!Array.isArray(person?.education_history)) return []
    return person.education_history
  }, [person?.education_history])

  const spouseEntries = useMemo(() => {
    if (!person) return []
    return getSpouseEntries(person.id, unions, persons)
  }, [person, unions, persons])

  const children = useMemo(() => {
    if (!person) return []
    return getChildren(persons, person.id)
  }, [person, persons])

  const siblings = useMemo(() => {
    if (!person) return []
    return getSiblings(persons, person)
  }, [person, persons])

  const handleBackdropClick = useCallback(
    (event) => {
      if (event.target === event.currentTarget) onClose?.()
    },
    [onClose],
  )

  if (!personId) return null

  const isOpen = Boolean(personId)
  const birthFormatted = formatPersonDate(person?.birth_date, person?.birth_date_approx)
  const deathFormatted = formatPersonDate(person?.death_date, person?.death_date_approx)
  const ageEndDate = person?.is_alive === false ? person?.death_date : null
  const age = computeAge(person?.birth_date, ageEndDate)
  const showBirthName =
    person?.birth_name &&
    person.birth_name.trim().toLowerCase() !== (person.last_name ?? '').trim().toLowerCase()

  const cityCountry = [person?.city, person?.country].filter(Boolean).join(', ')
  const fullAddress = [person?.address_line, person?.city, person?.country]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close panel"
        onClick={handleBackdropClick}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={person ? `Profile of ${getFullName(person)}` : 'Person profile'}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading && !person ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner />
            </div>
          ) : !person ? (
            <div className="flex h-64 items-center justify-center px-6 text-sm text-gray-500">
              Person not found.
            </div>
          ) : (
            <>
              <header>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-indigo-100">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-indigo-300">
                      {getInitials(person.first_name, person.last_name)}
                    </div>
                  )}
                  {person.is_alive === false && (
                    <span className="absolute bottom-3 left-3 text-lg" title="Deceased">
                      🕯
                    </span>
                  )}
                </div>

                <div className="space-y-2 px-4 pb-4 pt-4 sm:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{getFullName(person)}</h2>
                      {showBirthName && (
                        <p className="text-sm text-gray-600">({person.birth_name})</p>
                      )}
                      {person.nickname && (
                        <p className="text-sm italic text-gray-500">&ldquo;{person.nickname}&rdquo;</p>
                      )}
                    </div>
                    <Badge variant={person.is_alive === false ? 'muted' : 'success'}>
                      {person.is_alive === false ? 'Deceased' : 'Alive'}
                    </Badge>
                  </div>

                  {relationship && person.id !== rootPersonId && (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-indigo-700">
                        {relationship.formal.replace(/^Your /, '')}
                      </p>
                      {relationship.informal && (
                        <p className="text-sm text-indigo-500">{relationship.informal}</p>
                      )}
                    </div>
                  )}

                  {person.is_alive === false && deathFormatted && (
                    <p className="text-sm text-gray-600">
                      Died {deathFormatted}
                      {age !== null && ` · Age ${age}`}
                    </p>
                  )}
                </div>
              </header>

              <div className="flex flex-wrap gap-2 border-y border-gray-100 px-4 py-3 sm:px-6">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => onFocusInGraph?.(person.id)}
                >
                  <Focus className="mr-1.5 h-4 w-4" />
                  Focus in Tree
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => onEdit?.(person.id)}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit Profile
                </Button>
                <Button
                  variant={showFamily ? 'primary' : 'secondary'}
                  size="sm"
                  type="button"
                  onClick={() => setShowFamily((prev) => !prev)}
                >
                  <Users className="mr-1.5 h-4 w-4" />
                  View Family
                </Button>
              </div>

              <Section title="Personal Details">
                <dl>
                  <DetailRow label="Date of birth" value={birthFormatted ?? 'Not recorded'} />
                  {age !== null && (
                    <DetailRow
                      label="Age"
                      value={`${age} year${age === 1 ? '' : 's'}`}
                    />
                  )}
                  {person.phone && (
                    <DetailRow label="Phone">
                      <a
                        href={`tel:${person.phone}`}
                        className="text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {person.phone}
                      </a>
                    </DetailRow>
                  )}
                  {(cityCountry || person.address_line) && (
                    <DetailRow label="Address">
                      <div className="space-y-1">
                        <p>{addressExpanded ? fullAddress : cityCountry || person.address_line}</p>
                        {person.address_line && cityCountry && (
                          <button
                            type="button"
                            onClick={() => setAddressExpanded((prev) => !prev)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            {addressExpanded ? (
                              <>
                                Show less <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Show full address <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </DetailRow>
                  )}
                </dl>
              </Section>

              {person.current_occupation?.category && (
                <Section title="Current Occupation">
                  <div className="mb-3">
                    <Badge variant="primary">
                      {OCCUPATION_LABELS[person.current_occupation.category] ??
                        person.current_occupation.category}
                    </Badge>
                  </div>
                  {occupationEntries.length > 0 && (
                    <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                      {occupationEntries.map((entry) => (
                        <div
                          key={entry.key}
                          className="flex flex-col gap-0.5 px-3 py-2.5 sm:flex-row sm:justify-between"
                        >
                          <dt className="text-sm text-gray-500">{entry.label}</dt>
                          <dd className="text-sm font-medium text-gray-900">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </Section>
              )}

              {educationEntries.length > 0 && (
                <Section title="Education">
                  <ol className="space-y-4">
                    {educationEntries.map((entry, index) => {
                      const levelLabel =
                        EDUCATION_LEVELS.find((level) => level.value === entry.level)?.label ??
                        entry.level
                      const years = formatEducationYears(entry)
                      const subtitle = [entry.department, years].filter(Boolean).join(' · ')

                      return (
                        <li
                          key={`${entry.level}-${entry.institution_name}-${index}`}
                          className="relative border-l-2 border-indigo-200 pl-4"
                        >
                          <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-400" />
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="default">{levelLabel}</Badge>
                            {entry.is_ongoing && <Badge variant="warning">Ongoing</Badge>}
                          </div>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            {entry.institution_name || 'Unknown institution'}
                          </p>
                          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
                          {(entry.degree || entry.degree_or_certificate) && (
                            <p className="mt-1 text-xs text-gray-500">
                              {entry.degree || entry.degree_or_certificate}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                </Section>
              )}

              {showFamily && (
                <Section title="Family Connections">
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-gray-400">Father</p>
                      {person.father_id && persons[person.father_id] ? (
                        <MiniPersonButton
                          person={persons[person.father_id]}
                          photoUrl={relatedPhotoUrls[person.father_id]}
                          onClick={onFocusInGraph}
                        />
                      ) : (
                        <p className="text-sm text-gray-500">Not recorded</p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-gray-400">Mother</p>
                      {person.mother_id && persons[person.mother_id] ? (
                        <MiniPersonButton
                          person={persons[person.mother_id]}
                          photoUrl={relatedPhotoUrls[person.mother_id]}
                          onClick={onFocusInGraph}
                        />
                      ) : (
                        <p className="text-sm text-gray-500">Not recorded</p>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-gray-400">Spouse(s)</p>
                      {spouseEntries.length === 0 ? (
                        <p className="text-sm text-gray-500">None recorded</p>
                      ) : (
                        <ul className="space-y-2">
                          {spouseEntries.map(({ union, spouse }) => (
                            <li key={union.id} className="space-y-1">
                              <MiniPersonButton
                                person={spouse}
                                photoUrl={relatedPhotoUrls[spouse.id]}
                                onClick={onFocusInGraph}
                              />
                              <Badge variant="muted" className="ml-12">
                                {UNION_STATUS_LABELS[union.union_status] ??
                                  union.union_status}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-gray-400">Children</p>
                      {children.length === 0 ? (
                        <p className="text-sm text-gray-500">None recorded</p>
                      ) : (
                        <ul className="space-y-2">
                          {children.map((child) => (
                            <li key={child.id}>
                              <MiniPersonButton
                                person={child}
                                photoUrl={relatedPhotoUrls[child.id]}
                                onClick={onFocusInGraph}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase text-gray-400">Siblings</p>
                      {siblings.length === 0 ? (
                        <p className="text-sm text-gray-500">None recorded</p>
                      ) : (
                        <ul className="space-y-2">
                          {siblings.map((sibling) => (
                            <li key={sibling.id}>
                              <MiniPersonButton
                                person={sibling}
                                photoUrl={relatedPhotoUrls[sibling.id]}
                                onClick={onFocusInGraph}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </Section>
              )}

              {person.notes && (
                <Section title="Notes">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {person.notes}
                  </p>
                </Section>
              )}

              <footer className="border-t border-gray-100 px-4 py-4 text-xs text-gray-400 sm:px-6">
                {person.created_at && (
                  <p>
                    Added by a family member on{' '}
                    {format(parseISO(person.created_at), 'd MMMM yyyy')}
                  </p>
                )}
                {person.updated_at && (
                  <p className="mt-1">
                    Last updated by a family member on{' '}
                    {format(parseISO(person.updated_at), 'd MMMM yyyy')}
                  </p>
                )}
              </footer>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
