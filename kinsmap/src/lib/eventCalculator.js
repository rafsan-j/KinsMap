import {
  parseISO,
  isValid,
  differenceInCalendarDays,
  startOfDay,
  getYear,
  getMonth,
  getDate,
} from 'date-fns'

function toArray(collection) {
  if (Array.isArray(collection)) return collection
  if (collection && typeof collection === 'object') return Object.values(collection)
  return []
}

function parseDate(value) {
  if (!value) return null
  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

function ordinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const value = n % 100
  return n + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0])
}

function buildNextOccurrence(dateString, referenceDate = new Date()) {
  const source = parseDate(dateString)
  if (!source) return null

  const today = startOfDay(referenceDate)
  const month = getMonth(source)
  const day = getDate(source)
  const sourceYear = getYear(source)

  let next = new Date(today.getFullYear(), month, day)
  if (next < today) {
    next = new Date(today.getFullYear() + 1, month, day)
  }

  const daysUntil = differenceInCalendarDays(next, today)

  return {
    date: next,
    daysUntil,
    sourceYear,
  }
}

function getPersonDisplayName(person) {
  if (!person) return 'Unknown'
  return person.nickname || person.first_name || 'Unknown'
}

function getPersonFullLabel(person) {
  if (!person) return 'Unknown'
  const full = [person.first_name, person.last_name].filter(Boolean).join(' ')
  return person.nickname || full || 'Unknown'
}

function findPerson(personsMap, personId) {
  if (!personId) return null
  if (personsMap[personId]) return personsMap[personId]
  return null
}

function buildPersonsMap(persons) {
  const list = toArray(persons)
  return list.reduce((map, person) => {
    if (person?.id) map[person.id] = person
    return map
  }, {})
}

function getUnionDate(union) {
  return union.marriage_date ?? union.start_date ?? null
}

function getUnionStatus(union) {
  return union.status ?? union.union_status ?? null
}

export function getUpcomingEvents(persons, unions, daysAhead = 60) {
  const today = startOfDay(new Date())
  const personList = toArray(persons).filter((person) => !person.is_deleted)
  const unionList = toArray(unions).filter((union) => !union.is_deleted)
  const personsMap = buildPersonsMap(personList)
  const events = []

  for (const person of personList) {
    if (person.birth_date) {
      const occurrence = buildNextOccurrence(person.birth_date, today)
      if (occurrence && occurrence.daysUntil <= daysAhead) {
        const ageTurning = occurrence.date.getFullYear() - occurrence.sourceYear
        events.push({
          type: 'birthday',
          person,
          date: occurrence.date,
          daysUntil: occurrence.daysUntil,
          age_turning: ageTurning,
          approximate: Boolean(person.birth_date_approx),
        })
      }
    }

    if (person.death_date) {
      const occurrence = buildNextOccurrence(person.death_date, today)
      if (occurrence && occurrence.daysUntil <= daysAhead) {
        const yearsSince = occurrence.date.getFullYear() - occurrence.sourceYear
        events.push({
          type: 'memorial',
          person,
          date: occurrence.date,
          daysUntil: occurrence.daysUntil,
          years_since: yearsSince,
          approximate: Boolean(person.death_date_approx),
        })
      }
    }
  }

  for (const union of unionList) {
    if (getUnionStatus(union) !== 'active') continue

    const unionDate = getUnionDate(union)
    if (!unionDate) continue

    const occurrence = buildNextOccurrence(unionDate, today)
    if (!occurrence || occurrence.daysUntil > daysAhead) continue

    const partner1 = findPerson(personsMap, union.partner_1_id)
    const partner2 = findPerson(personsMap, union.partner_2_id)
    const yearsTogether = occurrence.date.getFullYear() - occurrence.sourceYear

    events.push({
      type: 'anniversary',
      union,
      partner1,
      partner2,
      date: occurrence.date,
      daysUntil: occurrence.daysUntil,
      years_together: yearsTogether,
    })
  }

  return events.sort((a, b) => a.daysUntil - b.daysUntil)
}

export function formatEventLabel(event) {
  if (!event?.type) return ''

  const approxPrefix = event.approximate ? '~' : ''

  if (event.type === 'birthday') {
    const name = getPersonFullLabel(event.person)
    return `${name}'s ${approxPrefix}${ordinal(event.age_turning)} Birthday`
  }

  if (event.type === 'memorial') {
    const name = getPersonFullLabel(event.person)
    return `${name}'s ${approxPrefix}${ordinal(event.years_since)} Death Anniversary`
  }

  if (event.type === 'anniversary') {
    const name1 = getPersonDisplayName(event.partner1)
    const name2 = getPersonDisplayName(event.partner2)
    return `${name1} & ${name2}'s ${ordinal(event.years_together)} Anniversary`
  }

  return ''
}

// Backward-compatible alias
export function calculateUpcomingEvents(persons, unions, daysAhead = 60) {
  return getUpcomingEvents(persons, unions, daysAhead)
}
