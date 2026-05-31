const relationshipCache = new Map()

const DIRECTION = {
  UP: 'UP',
  DOWN: 'DOWN',
  ACROSS: 'ACROSS',
}

function cacheKey(rootPersonId, targetPersonId) {
  return `${rootPersonId}:${targetPersonId}`
}

function getGender(person) {
  return person?.gender ?? 'unspecified'
}

function ordinal(n) {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0])
}

function parentTerm(gender) {
  if (gender === 'male') return 'Father'
  if (gender === 'female') return 'Mother'
  return 'Parent'
}

function childTerm(gender) {
  if (gender === 'male') return 'Son'
  if (gender === 'female') return 'Daughter'
  return 'Child'
}

function spouseTerm(gender) {
  if (gender === 'male') return 'Husband'
  if (gender === 'female') return 'Wife'
  return 'Spouse'
}

function grandparentTerm(gender, greatCount = 0) {
  const prefix = greatCount > 0 ? `${'Great-'.repeat(greatCount)}` : ''
  if (gender === 'male') return `${prefix}Grandfather`
  if (gender === 'female') return `${prefix}Grandmother`
  return `${prefix}Grandparent`
}

function grandchildTerm(gender, greatCount = 0) {
  const prefix = greatCount > 0 ? `${'Great-'.repeat(greatCount)}` : ''
  if (gender === 'male') return `${prefix}Grandson`
  if (gender === 'female') return `${prefix}Granddaughter`
  return `${prefix}Grandchild`
}

function siblingTerm(gender) {
  if (gender === 'male') return 'Brother'
  if (gender === 'female') return 'Sister'
  return 'Sibling'
}

function uncleAuntTerm(gender) {
  if (gender === 'male') return 'Uncle'
  if (gender === 'female') return 'Aunt'
  return 'Uncle/Aunt'
}

function nephewNieceTerm(gender) {
  if (gender === 'male') return 'Nephew'
  if (gender === 'female') return 'Niece'
  return 'Nephew/Niece'
}

function cousinTerm(degree, removal, gender) {
  const degreeLabel =
    degree === 1 ? 'First Cousin' : degree === 2 ? 'Second Cousin' : `${ordinal(degree)} Cousin`

  let label = degreeLabel

  if (removal === 1) {
    label += ' Once Removed'
  } else if (removal > 1) {
    label += ` ${ordinal(removal)} Removed`
  }

  if (gender === 'male') return label
  if (gender === 'female') return label
  return label
}

function stepRelationLabel(fromPerson, toPerson, direction) {
  const gender = getGender(toPerson)

  if (direction === DIRECTION.UP) return parentTerm(gender)
  if (direction === DIRECTION.DOWN) return childTerm(gender)
  return spouseTerm(gender)
}

function buildPossessiveChain(path, persons, rootPersonId) {
  let currentId = rootPersonId
  const segments = []

  for (const step of path) {
    const fromPerson = persons[currentId]
    const toPerson = persons[step.personId]
    if (!fromPerson || !toPerson) return 'Unknown'

    segments.push(stepRelationLabel(fromPerson, toPerson, step.direction))
    currentId = step.personId
  }

  if (segments.length === 0) return 'You'
  return `Your ${segments.join("'s ")}`
}

function splitPathByAcross(directions) {
  const acrossIndex = directions.indexOf(DIRECTION.ACROSS)
  if (acrossIndex === -1) {
    return { before: directions, after: [] }
  }
  return {
    before: directions.slice(0, acrossIndex + 1),
    after: directions.slice(acrossIndex + 1),
  }
}

function countPrefix(directions, direction) {
  let count = 0
  for (const step of directions) {
    if (step !== direction) break
    count += 1
  }
  return count
}

function countSuffix(directions, direction) {
  let count = 0
  for (let i = directions.length - 1; i >= 0; i -= 1) {
    if (directions[i] !== direction) break
    count += 1
  }
  return count
}

function isUpDownPattern(directions) {
  let index = 0
  while (index < directions.length && directions[index] === DIRECTION.UP) index += 1
  while (index < directions.length && directions[index] === DIRECTION.DOWN) index += 1
  return index === directions.length
}

function analyzeBloodPath(directions) {
  const ups = countPrefix(directions, DIRECTION.UP)
  const downs = countSuffix(directions, DIRECTION.DOWN)
  const middle = directions.slice(ups, directions.length - downs)

  return { ups, downs, middle, isPure: middle.length === 0 && isUpDownPattern(directions) }
}

function buildGraph(persons, unions) {
  const adjacency = new Map()

  const addEdge = (fromId, toId, direction) => {
    if (!fromId || !toId || !persons[fromId] || !persons[toId]) return
    if (!adjacency.has(fromId)) adjacency.set(fromId, [])
    adjacency.get(fromId).push({ id: toId, direction })
  }

  for (const person of Object.values(persons)) {
    if (person.is_deleted) continue

    if (person.father_id) {
      addEdge(person.id, person.father_id, DIRECTION.UP)
      addEdge(person.father_id, person.id, DIRECTION.DOWN)
    }

    if (person.mother_id) {
      addEdge(person.id, person.mother_id, DIRECTION.UP)
      addEdge(person.mother_id, person.id, DIRECTION.DOWN)
    }
  }

  for (const union of unions) {
    if (union.is_deleted) continue
    addEdge(union.partner_1_id, union.partner_2_id, DIRECTION.ACROSS)
    addEdge(union.partner_2_id, union.partner_1_id, DIRECTION.ACROSS)
  }

  return adjacency
}

function bfs(graph, startId, targetId) {
  if (startId === targetId) return []

  const queue = [{ id: startId, path: [] }]
  const visited = new Set([startId])

  while (queue.length > 0) {
    const { id, path } = queue.shift()
    const neighbors = graph.get(id) ?? []

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.id)) continue

      const nextPath = [...path, { direction: neighbor.direction, personId: neighbor.id }]

      if (neighbor.id === targetId) {
        return nextPath
      }

      visited.add(neighbor.id)
      queue.push({ id: neighbor.id, path: nextPath })
    }
  }

  return null
}

function wentThroughMother(path, persons, rootPersonId) {
  if (path.length === 0) return false
  const firstStep = path[0]
  if (firstStep.direction !== DIRECTION.UP) return false
  const root = persons[rootPersonId]
  return root?.mother_id === firstStep.personId
}

function wentThroughFather(path, persons, rootPersonId) {
  if (path.length === 0) return false
  const firstStep = path[0]
  if (firstStep.direction !== DIRECTION.UP) return false
  const root = persons[rootPersonId]
  return root?.father_id === firstStep.personId
}

function getParentSide(path, persons, rootPersonId) {
  if (wentThroughMother(path, persons, rootPersonId)) return 'maternal'
  if (wentThroughFather(path, persons, rootPersonId)) return 'paternal'
  return 'unknown'
}

function formalLabelFromPath(path, persons, rootPersonId, targetPersonId) {
  if (path.length === 0) return 'You'

  const directions = path.map((step) => step.direction)
  const targetPerson = persons[targetPersonId]
  const targetGender = getGender(targetPerson)

  if (directions.length === 1) {
    const [only] = directions
    if (only === DIRECTION.UP) return `Your ${parentTerm(targetGender)}`
    if (only === DIRECTION.DOWN) return `Your ${childTerm(targetGender)}`
    if (only === DIRECTION.ACROSS) return `Your ${spouseTerm(targetGender)}`
  }

  const { before, after } = splitPathByAcross(directions)

  if (before.length === 1 && before[0] === DIRECTION.ACROSS && after.length > 0) {
    const spouseGender = getGender(persons[path[0].personId])
    const inLawLabel = formalLabelFromPath(
      path.slice(1),
      persons,
      path[0].personId,
      targetPersonId,
    )
    const spouseRole = spouseTerm(spouseGender)
    if (inLawLabel === 'You') return `Your ${spouseRole}`
    return inLawLabel.replace(/^Your /, `Your ${spouseRole}'s `)
  }

  if (after.length > 0 && before.some((d) => d !== DIRECTION.ACROSS)) {
    return buildPossessiveChain(path, persons, rootPersonId)
  }

  const bloodDirections =
    directions.filter((d) => d !== DIRECTION.ACROSS).length === directions.length
      ? directions
      : before

  if (!isUpDownPattern(bloodDirections)) {
    return buildPossessiveChain(path, persons, rootPersonId)
  }

  const { ups, downs, isPure } = analyzeBloodPath(bloodDirections)

  if (!isPure) {
    return buildPossessiveChain(path, persons, rootPersonId)
  }

  if (downs === 0 && ups > 0) {
    if (ups === 1) return `Your ${parentTerm(targetGender)}`
    const greatCount = Math.max(0, ups - 2)
    return `Your ${grandparentTerm(targetGender, greatCount)}`
  }

  if (ups === 0 && downs > 0) {
    if (downs === 1) return `Your ${childTerm(targetGender)}`
    const greatCount = Math.max(0, downs - 2)
    return `Your ${grandchildTerm(targetGender, greatCount)}`
  }

  if (ups === 1 && downs === 1) {
    return `Your ${siblingTerm(targetGender)}`
  }

  if (ups === 2 && downs === 1) {
    return `Your ${uncleAuntTerm(targetGender)}`
  }

  if (ups === 1 && downs === 2) {
    return `Your ${nephewNieceTerm(targetGender)}`
  }

  if (ups >= 2 && downs >= 2) {
    const degree = Math.min(ups, downs) - 1
    const removal = Math.abs(ups - downs)
    return `Your ${cousinTerm(degree, removal, targetGender)}`
  }

  if (directions.includes(DIRECTION.ACROSS)) {
    const acrossOnly = directions.every((d) => d === DIRECTION.ACROSS)
    if (acrossOnly) {
      return buildPossessiveChain(path, persons, rootPersonId)
    }
  }

  return buildPossessiveChain(path, persons, rootPersonId)
}

export function getInformalLabel(path, targetPerson, persons, rootPersonId) {
  if (!path?.length || !targetPerson) return null

  const directions = path.map((step) => step.direction)
  const targetGender = getGender(targetPerson)
  const side = getParentSide(path, persons, rootPersonId)

  if (directions.length === 2 && directions[0] === DIRECTION.UP && directions[1] === DIRECTION.UP) {
    const firstParent = persons[path[0].personId]
    const grandparent = targetPerson

    if (getGender(firstParent) === 'female' && getGender(grandparent) === 'male') {
      return 'Nana'
    }
    if (getGender(firstParent) === 'female' && getGender(grandparent) === 'female') {
      return 'Nani'
    }
    if (getGender(firstParent) === 'male' && getGender(grandparent) === 'female') {
      return 'Dadi'
    }
    if (getGender(firstParent) === 'male' && getGender(grandparent) === 'male') {
      return 'Dada'
    }
  }

  if (
    directions.length === 3 &&
    directions[0] === DIRECTION.UP &&
    directions[1] === DIRECTION.UP &&
    directions[2] === DIRECTION.DOWN
  ) {
    const firstParent = persons[path[0].personId]

    if (side === 'maternal' && targetGender === 'male') return 'Mama'
    if (side === 'maternal' && targetGender === 'female') return 'Masi'
    if (side === 'paternal' && targetGender === 'male') return 'Chacha'
    if (side === 'paternal' && targetGender === 'female') return 'Pishi'
  }

  if (
    directions.length === 4 &&
    directions[0] === DIRECTION.UP &&
    directions[1] === DIRECTION.UP &&
    directions[2] === DIRECTION.DOWN &&
    directions[3] === DIRECTION.ACROSS
  ) {
    const auntOrUncle = persons[path[2].personId]
    if (side === 'paternal' && getGender(auntOrUncle) === 'female' && targetGender === 'male') {
      return 'Fufa'
    }
    if (side === 'maternal' && getGender(auntOrUncle) === 'female' && targetGender === 'male') {
      return 'Khalu'
    }
  }

  if (directions.length === 1 && directions[0] === DIRECTION.UP) {
    if (targetGender === 'male') return 'Baba'
    if (targetGender === 'female') return 'Ma'
  }

  if (directions.length === 1 && directions[0] === DIRECTION.DOWN) {
    if (targetGender === 'male') return 'Chele'
    if (targetGender === 'female') return 'Meye'
  }

  if (directions.length === 2 && directions[0] === DIRECTION.UP && directions[1] === DIRECTION.DOWN) {
    if (targetGender === 'male') return 'Bhai'
    if (targetGender === 'female') return 'Bon'
  }

  return null
}

export function computeRelationship(persons, unions, rootPersonId, targetPersonId) {
  const key = cacheKey(rootPersonId, targetPersonId)

  if (relationshipCache.has(key)) {
    return relationshipCache.get(key)
  }

  if (!persons?.[rootPersonId] || !persons?.[targetPersonId]) {
    const result = { formal: 'Unknown', informal: null, path: [] }
    relationshipCache.set(key, result)
    return result
  }

  if (rootPersonId === targetPersonId) {
    const result = { formal: 'You', informal: null, path: [] }
    relationshipCache.set(key, result)
    return result
  }

  const graph = buildGraph(persons, unions ?? [])
  const path = bfs(graph, rootPersonId, targetPersonId)

  if (!path) {
    const result = { formal: 'Not Related', informal: null, path: [] }
    relationshipCache.set(key, result)
    return result
  }

  const targetPerson = persons[targetPersonId]
  const formal = formalLabelFromPath(path, persons, rootPersonId, targetPersonId)
  const informal = getInformalLabel(path, targetPerson, persons, rootPersonId)

  const result = { formal, informal, path }
  relationshipCache.set(key, result)
  return result
}

export function clearRelationshipCache() {
  relationshipCache.clear()
}

export function buildAdjacencyGraph(persons, unions) {
  return buildGraph(persons, unions)
}

export function findRelationshipPath(persons, unions, rootPersonId, targetPersonId) {
  const graph = buildGraph(persons, unions ?? [])
  return bfs(graph, rootPersonId, targetPersonId)
}
