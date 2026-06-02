import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0) ?? ''
  const last = lastName?.charAt(0) ?? ''
  return (first + last).toUpperCase() || '?'
}

function GraphNode({ data }) {
  const {
    person,
    photoUrl,
    relationshipLabel,
    informalLabel,
    isFocus,
    isDeceased,
    onFocusChange,
    onPersonClick,
  } = data

  const isMale = person.gender === 'male'
  const isFemale = person.gender === 'female'

  const handleClick = () => {
    onFocusChange?.(person.id)
    onPersonClick?.(person.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleClick()
        }
      }}
      className={`relative flex w-[112px] flex-col items-center gap-1.5 border-2 bg-white p-2 shadow-md transition-shadow hover:shadow-lg ${
        isMale ? 'rounded-sm' : isFemale ? 'rounded-2xl' : 'rounded-lg'
      } ${isFocus ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'} ${
        isDeceased ? 'opacity-60' : ''
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
      <Handle
        type="target"
        position={Position.Left}
        id="spouse-target"
        className="!bg-pink-400 !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="spouse-source"
        className="!bg-pink-400 !w-2 !h-2"
      />

      {isDeceased && (
        <span className="absolute right-1 top-1 text-xs" title="Deceased">
          🕯
        </span>
      )}

      <div
        className={`flex h-12 w-12 items-center justify-center overflow-hidden bg-indigo-100 text-sm font-semibold text-indigo-700 ${
          isMale ? 'rounded-sm' : isFemale ? 'rounded-full' : 'rounded-md'
        }`}
      >
        {photoUrl ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          getInitials(person.first_name, person.last_name)
        )}
      </div>

      <p className="max-w-full truncate text-center text-xs font-semibold text-gray-900">
        {person.first_name || 'Unknown'}
      </p>

      {relationshipLabel && (
        <p className="max-w-full truncate text-center text-[10px] leading-tight text-gray-500">
          {relationshipLabel}
        </p>
      )}

      {informalLabel && (
        <p className="max-w-full truncate text-center text-[10px] leading-tight text-indigo-600">
          {informalLabel}
        </p>
      )}
    </div>
  )
}

export default memo(GraphNode)
