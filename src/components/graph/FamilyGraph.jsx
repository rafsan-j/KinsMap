import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import GraphNode from './GraphNode'
import edgeTypes from './GraphEdge'
import {
  buildGraphEdges,
  computeVisiblePersons,
  layoutGraphNodes,
} from './graphLayout'
import { usePersons, getPersonPhotoUrl } from '../../hooks/usePersons'
import { fetchUnions } from '../../hooks/useUnions'
import { computeRelationship } from '../../lib/relationshipEngine'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

const nodeTypes = { graphNode: GraphNode }

function FitViewOnChange({ focusPersonId, nodeCount }) {
  const { fitView } = useReactFlow()

  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.25, duration: 300 })
    }, 50)
    return () => clearTimeout(timer)
  }, [focusPersonId, nodeCount, fitView])

  return null
}

function FamilyGraphInner({
  treeId,
  focusPersonId,
  onFocusChange,
  onPersonClick,
  depthLevel: depthLevelProp = 1,
  onDepthChange,
  userPersonId,
}) {
  const { persons, loading, error, fetchPersons } = usePersons()
  const [unions, setUnions] = useState([])
  const [unionsLoading, setUnionsLoading] = useState(true)
  const [photoUrls, setPhotoUrls] = useState({})
  const [internalDepth, setInternalDepth] = useState(depthLevelProp)

  const depthLevel = onDepthChange ? depthLevelProp : internalDepth

  const setDepthLevel = useCallback(
    (next) => {
      const clamped = Math.min(3, Math.max(1, next))
      if (onDepthChange) {
        onDepthChange(clamped)
      } else {
        setInternalDepth(clamped)
      }
    },
    [onDepthChange],
  )

  useEffect(() => {
    setInternalDepth(depthLevelProp)
  }, [depthLevelProp])

  useEffect(() => {
    if (!treeId) return
    fetchPersons(treeId)
  }, [treeId, fetchPersons])

  useEffect(() => {
    if (!treeId) return

    let cancelled = false

    async function loadUnions() {
      setUnionsLoading(true)
      const { data, error: unionsError } = await fetchUnions(treeId)
      if (!cancelled) {
        if (!unionsError && data) setUnions(data)
        setUnionsLoading(false)
      }
    }

    loadUnions()
    return () => {
      cancelled = true
    }
  }, [treeId])

  const { visibleIds, generations } = useMemo(
    () => computeVisiblePersons(persons, unions, focusPersonId, depthLevel),
    [persons, unions, focusPersonId, depthLevel],
  )

  useEffect(() => {
    let cancelled = false

    async function loadPhotos() {
      const entries = await Promise.all(
        [...visibleIds].map(async (personId) => {
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

    if (visibleIds.size > 0) {
      loadPhotos()
    }

    return () => {
      cancelled = true
    }
  }, [visibleIds, persons])

  const positions = useMemo(
    () => layoutGraphNodes(visibleIds, generations, persons, unions, focusPersonId),
    [visibleIds, generations, persons, unions, focusPersonId],
  )

  const initialNodes = useMemo(() => {
    return [...visibleIds].map((personId) => {
      const person = persons[personId]
      const relationship = computeRelationship(
        persons,
        unions,
        focusPersonId,
        personId,
      )
      const position = positions.get(personId) ?? { x: 0, y: 0 }

      return {
        id: personId,
        type: 'graphNode',
        position,
        data: {
          person,
          photoUrl: photoUrls[personId],
          relationshipLabel:
            personId === focusPersonId ? 'You' : relationship.formal.replace(/^Your /, ''),
          informalLabel: relationship.informal,
          isFocus: personId === focusPersonId,
          isDeceased: person.is_alive === false,
          onFocusChange,
          onPersonClick,
        },
      }
    })
  }, [
    visibleIds,
    persons,
    unions,
    focusPersonId,
    positions,
    photoUrls,
    onFocusChange,
    onPersonClick,
  ])

  const initialEdges = useMemo(
    () => buildGraphEdges(visibleIds, persons, unions),
    [visibleIds, persons, unions],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const handleRecenter = () => {
    if (userPersonId) {
      onFocusChange?.(userPersonId)
    }
  }

  if (loading || unionsLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50" style={{ minHeight: 480 }}>
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-6 text-sm text-red-600" style={{ minHeight: 480 }}>
        {error}
      </div>
    )
  }

  if (!persons[focusPersonId]) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-6 text-sm text-gray-600" style={{ minHeight: 480 }}>
        Focus person not found.
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-gray-50" style={{ minHeight: 480 }}>
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2 sm:left-4 sm:top-4">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={depthLevel <= 1}
          onClick={() => setDepthLevel(depthLevel - 1)}
        >
          Show Less
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={depthLevel >= 3}
          onClick={() => setDepthLevel(depthLevel + 1)}
        >
          Show More
        </Button>
        {userPersonId && (
          <Button variant="secondary" size="sm" type="button" onClick={handleRecenter}>
            Recenter
          </Button>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        minZoom={0.3}
        maxZoom={1.5}
        fitView
      >
        <Background gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} />
        <FitViewOnChange focusPersonId={focusPersonId} nodeCount={nodes.length} />
      </ReactFlow>
    </div>
  )
}

export default function FamilyGraph(props) {
  return (
    <ReactFlowProvider>
      <FamilyGraphInner {...props} />
    </ReactFlowProvider>
  )
}
