import { BaseEdge, getSmoothStepPath, Position } from '@xyflow/react'

const ARROW_COLOR = '#374151'

export function ParentChildEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  data,
}) {
  const isNonBiological =
    data?.relType === 'adoptive' || data?.relType === 'step'

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  })

  const markerId = `parent-arrow-${id}`

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={isNonBiological ? '#6366f1' : ARROW_COLOR} />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isNonBiological ? '#6366f1' : ARROW_COLOR,
          strokeWidth: 2,
          strokeDasharray: isNonBiological ? '6 4' : undefined,
        }}
        markerEnd={`url(#${markerId})`}
      />
    </>
  )
}

export function UnionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  data,
}) {
  const isDivorced =
    data?.status === 'divorced' ||
    data?.status === 'separated' ||
    data?.status === 'widowed'

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 0,
  })

  if (isDivorced) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#9ca3af',
          strokeWidth: 2,
          strokeDasharray: '6 4',
        }}
      />
    )
  }

  const offset = 4
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = (-dy / length) * offset
  const ny = (dx / length) * offset

  const parallelPath = (sign) => {
    const [path] = getSmoothStepPath({
      sourceX: sourceX + nx * sign,
      sourceY: sourceY + ny * sign,
      targetX: targetX + nx * sign,
      targetY: targetY + ny * sign,
      sourcePosition,
      targetPosition,
      borderRadius: 0,
    })
    return path
  }

  return (
    <>
      <path
        d={parallelPath(1)}
        fill="none"
        stroke="#1f2937"
        strokeWidth={2}
        className="react-flow__edge-path"
      />
      <path
        d={parallelPath(-1)}
        fill="none"
        stroke="#1f2937"
        strokeWidth={2}
        className="react-flow__edge-path"
      />
    </>
  )
}

const edgeTypes = {
  parentChild: ParentChildEdge,
  union: UnionEdge,
}

export default edgeTypes
