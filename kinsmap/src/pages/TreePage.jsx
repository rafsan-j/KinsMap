import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import FamilyGraph from '../components/graph/FamilyGraph'
import PersonPanel from '../components/person/PersonPanel'

export default function TreePage() {
  const { focusPersonId: routeFocusId } = useParams()
  const navigate = useNavigate()
  const { treeId, linkedPersonId } = useAuth()

  const focusPersonId = routeFocusId || linkedPersonId
  const [depthLevel, setDepthLevel] = useState(2)
  const [panelPersonId, setPanelPersonId] = useState(null)

  const handleFocusChange = useCallback(
    (personId) => {
      navigate(personId ? `/tree/${personId}` : '/tree')
    },
    [navigate],
  )

  if (!treeId || !focusPersonId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-gray-500">
        Loading family tree…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 -mt-4 h-[calc(100vh-8rem)] sm:-mx-6 sm:-mt-6 md:h-[calc(100vh-5.5rem)]">
        <FamilyGraph
          treeId={treeId}
          focusPersonId={focusPersonId}
          userPersonId={linkedPersonId}
          depthLevel={depthLevel}
          onDepthChange={setDepthLevel}
          onFocusChange={handleFocusChange}
          onPersonClick={setPanelPersonId}
        />
      </div>

      <PersonPanel
        personId={panelPersonId}
        rootPersonId={linkedPersonId}
        onClose={() => setPanelPersonId(null)}
        onEdit={() => {}}
        onFocusInGraph={(personId) => {
          setPanelPersonId(null)
          handleFocusChange(personId)
        }}
      />
    </div>
  )
}
