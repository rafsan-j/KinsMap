const ROW_HEIGHT = 160
const NODE_WIDTH = 112
const NODE_GAP = 48
const FOCUS_Y = 280

export function getChildren(persons, parentId) {
  return Object.values(persons).filter(
    (person) =>
      !person.is_deleted &&
      (person.father_id === parentId || person.mother_id === parentId),
  )
}

export function getSiblings(persons, focusPerson) {
  return Object.values(persons).filter((person) => {
    if (person.is_deleted || person.id === focusPerson.id) return false

    const sharesFather =
      focusPerson.father_id && person.father_id === focusPerson.father_id
    const sharesMother =
      focusPerson.mother_id && person.mother_id === focusPerson.mother_id

    return sharesFather || sharesMother
  })
}

export function getSpouseIds(focusPersonId, unions) {
  const spouseIds = new Set()

  for (const union of unions) {
    if (union.is_deleted) continue
    if (union.partner_1_id === focusPersonId) spouseIds.add(union.partner_2_id)
    if (union.partner_2_id === focusPersonId) spouseIds.add(union.partner_1_id)
  }

  return spouseIds
}

export function computeVisiblePersons(persons, unions, focusPersonId, depthLevel) {
  const focusPerson = persons[focusPersonId]
  if (!focusPerson) {
    return { visibleIds: new Set(), generations: new Map() }
  }

  const visibleIds = new Set([focusPersonId])
  const generations = new Map([[focusPersonId, 0]])

  const addPerson = (personId, generation) => {
    if (!personId || !persons[personId] || persons[personId].is_deleted) return
    visibleIds.add(personId)
    generations.set(personId, generation)
  }

  const addParents = (person, generation) => {
    addPerson(person.father_id, generation)
    addPerson(person.mother_id, generation)
  }

  addParents(focusPerson, -1)

  if (depthLevel >= 2) {
    if (focusPerson.father_id && persons[focusPerson.father_id]) {
      addParents(persons[focusPerson.father_id], -2)
    }
    if (focusPerson.mother_id && persons[focusPerson.mother_id]) {
      addParents(persons[focusPerson.mother_id], -2)
    }
  }

  if (depthLevel >= 3) {
    for (const personId of [...visibleIds]) {
      const generation = generations.get(personId)
      if (generation === -2 && persons[personId]) {
        addParents(persons[personId], -3)
      }
    }
  }

  for (const sibling of getSiblings(persons, focusPerson)) {
    addPerson(sibling.id, 0)
  }

  for (const spouseId of getSpouseIds(focusPersonId, unions)) {
    addPerson(spouseId, 0)
  }

  const children = getChildren(persons, focusPersonId)
  for (const child of children) {
    addPerson(child.id, 1)
  }

  if (depthLevel >= 2) {
    for (const child of children) {
      for (const grandchild of getChildren(persons, child.id)) {
        addPerson(grandchild.id, 2)
      }
    }
  }

  if (depthLevel >= 3) {
    for (const personId of [...visibleIds]) {
      if (generations.get(personId) === 2) {
        for (const greatGrandchild of getChildren(persons, personId)) {
          addPerson(greatGrandchild.id, 3)
        }
      }
    }
  }

  return { visibleIds, generations }
}

function sortRowIds(ids, focusPersonId, persons, unions) {
  const focusPerson = persons[focusPersonId]
  const spouseIds = getSpouseIds(focusPersonId, unions)
  const siblingIds = new Set(
    focusPerson ? getSiblings(persons, focusPerson).map((sibling) => sibling.id) : [],
  )

  const siblings = []
  const partners = []
  const others = []
  let focus = null

  for (const id of ids) {
    if (id === focusPersonId) {
      focus = id
    } else if (spouseIds.has(id)) {
      partners.push(id)
    } else if (siblingIds.has(id)) {
      siblings.push(id)
    } else {
      others.push(id)
    }
  }

  siblings.sort((a, b) =>
    (persons[a]?.first_name ?? '').localeCompare(persons[b]?.first_name ?? ''),
  )
  partners.sort((a, b) =>
    (persons[a]?.first_name ?? '').localeCompare(persons[b]?.first_name ?? ''),
  )
  others.sort((a, b) =>
    (persons[a]?.first_name ?? '').localeCompare(persons[b]?.first_name ?? ''),
  )

  const ordered = [...others, ...siblings]
  if (focus) ordered.push(focus)
  ordered.push(...partners)

  return ordered.length ? ordered : ids
}

export function layoutGraphNodes(visibleIds, generations, persons, unions, focusPersonId) {
  const byGeneration = new Map()

  for (const personId of visibleIds) {
    const generation = generations.get(personId) ?? 0
    if (!byGeneration.has(generation)) byGeneration.set(generation, [])
    byGeneration.get(generation).push(personId)
  }

  const positions = new Map()

  for (const [generation, ids] of byGeneration.entries()) {
    const sortedIds =
      generation === 0
        ? sortRowIds(ids, focusPersonId, persons, unions)
        : [...ids].sort((a, b) =>
            (persons[a]?.first_name ?? '').localeCompare(persons[b]?.first_name ?? ''),
          )

    const rowWidth =
      sortedIds.length * NODE_WIDTH + Math.max(0, sortedIds.length - 1) * NODE_GAP
    let x = -rowWidth / 2
    const y = FOCUS_Y + generation * ROW_HEIGHT

    for (const personId of sortedIds) {
      positions.set(personId, { x, y })
      x += NODE_WIDTH + NODE_GAP
    }
  }

  return positions
}

export function buildGraphEdges(visibleIds, persons, unions) {
  const edges = []

  for (const personId of visibleIds) {
    const person = persons[personId]
    if (!person) continue

    if (person.father_id && visibleIds.has(person.father_id)) {
      edges.push({
        id: `father-${person.father_id}-${person.id}`,
        source: person.father_id,
        target: person.id,
        type: 'parentChild',
        data: { relType: person.father_rel_type || 'biological' },
      })
    }

    if (person.mother_id && visibleIds.has(person.mother_id)) {
      edges.push({
        id: `mother-${person.mother_id}-${person.id}`,
        source: person.mother_id,
        target: person.id,
        type: 'parentChild',
        data: { relType: person.mother_rel_type || 'biological' },
      })
    }
  }

  for (const union of unions) {
    if (union.is_deleted) continue
    if (
      visibleIds.has(union.partner_1_id) &&
      visibleIds.has(union.partner_2_id)
    ) {
      edges.push({
        id: `union-${union.id}`,
        source: union.partner_1_id,
        target: union.partner_2_id,
        type: 'union',
        data: { status: union.union_status },
      })
    }
  }

  return edges
}

export { FOCUS_Y, ROW_HEIGHT }
