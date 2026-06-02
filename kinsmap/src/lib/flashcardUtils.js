const MISSED_STORAGE_KEY = 'kinsmap_missed_cards'

export const GAME_MODES = {
  FACE_TO_NAME: 'face-to-name',
  CLUE_TO_PERSON: 'clue-to-person',
  NAME_TO_RELATION: 'name-to-relation',
  BIRTHDAY_CHALLENGE: 'birthday-challenge',
}

export const MODE_CONFIG = {
  [GAME_MODES.FACE_TO_NAME]: {
    id: GAME_MODES.FACE_TO_NAME,
    title: 'Face to Name',
    description: 'See a photo — recall their name and relationship.',
    requiresPhoto: true,
  },
  [GAME_MODES.CLUE_TO_PERSON]: {
    id: GAME_MODES.CLUE_TO_PERSON,
    title: 'Clue to Person',
    description: 'Occupation and city clues — guess who it is.',
    requiresPhoto: true,
  },
  [GAME_MODES.NAME_TO_RELATION]: {
    id: GAME_MODES.NAME_TO_RELATION,
    title: 'Name to Relation',
    description: 'See a name — recall how they relate to you.',
    requiresPhoto: false,
  },
  [GAME_MODES.BIRTHDAY_CHALLENGE]: {
    id: GAME_MODES.BIRTHDAY_CHALLENGE,
    title: 'Birthday Challenge',
    description: 'Photo and name — remember their birth month.',
    requiresPhoto: true,
  },
}

export const BRANCH_FILTERS = {
  ALL: 'all',
  MATERNAL: 'maternal',
  PATERNAL: 'paternal',
}

export function loadMissedPersonIds() {
  try {
    const raw = localStorage.getItem(MISSED_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveMissedPersonIds(ids) {
  localStorage.setItem(MISSED_STORAGE_KEY, JSON.stringify([...new Set(ids)]))
}

export function fisherYatesShuffle(array) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function collectConnectedSide(startPersonId, persons) {
  if (!startPersonId || !persons[startPersonId]) return new Set()

  const side = new Set()
  const queue = [startPersonId]

  while (queue.length > 0) {
    const id = queue.shift()
    if (!id || side.has(id) || !persons[id] || persons[id].is_deleted) continue

    side.add(id)

    const person = persons[id]
    if (person.father_id) queue.push(person.father_id)
    if (person.mother_id) queue.push(person.mother_id)

    for (const candidate of Object.values(persons)) {
      if (candidate.is_deleted) continue
      if (candidate.father_id === id || candidate.mother_id === id) {
        queue.push(candidate.id)
      }
    }
  }

  return side
}

export function getBranchPersonIds(persons, rootPersonId, branchFilter) {
  if (branchFilter === BRANCH_FILTERS.ALL) {
    return new Set(
      Object.values(persons)
        .filter((person) => !person.is_deleted)
        .map((person) => person.id),
    )
  }

  const root = persons[rootPersonId]
  if (!root) return new Set()

  const anchorId =
    branchFilter === BRANCH_FILTERS.MATERNAL ? root.mother_id : root.father_id

  if (!anchorId) return new Set()

  return collectConnectedSide(anchorId, persons)
}

export function filterGamePersons({
  persons,
  rootPersonId,
  mode,
  branchFilter,
}) {
  const personsMap =
    typeof persons === 'object' && !Array.isArray(persons)
      ? persons
      : persons.reduce((map, person) => {
          map[person.id] = person
          return map
        }, {})

  const branchIds = getBranchPersonIds(personsMap, rootPersonId, branchFilter)
  const modeConfig = MODE_CONFIG[mode]
  const requiresPhoto = modeConfig?.requiresPhoto ?? false

  return Object.values(personsMap).filter((person) => {
    if (person.is_deleted) return false
    if (person.id === rootPersonId) return false
    if (!branchIds.has(person.id)) return false
    if (requiresPhoto && !person.profile_picture_url) return false
    if (mode === GAME_MODES.BIRTHDAY_CHALLENGE && !person.birth_date) return false
    if (mode === GAME_MODES.NAME_TO_RELATION) {
      return Boolean(person.first_name || person.last_name)
    }
    return true
  })
}

export function buildDeck(persons, missedPersonIds) {
  const deck = [...persons]

  for (const personId of missedPersonIds) {
    const person = persons.find((item) => item.id === personId)
    if (person) {
      deck.push(person, person)
    }
  }

  return fisherYatesShuffle(deck)
}

export function getFullName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown'
}

export function getOccupationClue(person) {
  const occupation = person?.current_occupation
  if (!occupation?.category) return 'Occupation not recorded'

  const category = occupation.category.replace(/_/g, ' ')
  const detail =
    occupation.job_title ||
    occupation.business_name ||
    occupation.institution_name ||
    occupation.former_occupation ||
    occupation.class_or_year ||
    ''

  return detail ? `${category} · ${detail}` : category
}

export { MISSED_STORAGE_KEY }
