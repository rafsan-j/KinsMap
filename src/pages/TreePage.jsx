import { useCallback, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePersons } from '../hooks/usePersons'
import FamilyGraph from '../components/graph/FamilyGraph'
import PersonForm from '../components/person/PersonForm'
import PersonPanel from '../components/person/PersonPanel'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'

export default function TreePage() {
  const { focusPersonId: routeFocusId } = useParams()
  const navigate = useNavigate()
  const { treeId, linkedPersonId, userRole, isLoading } = useAuth()
  const { persons, loading: personsLoading, fetchPersons, getPersonById } = usePersons()

  const focusPersonId = routeFocusId || linkedPersonId
  const [depthLevel, setDepthLevel] = useState(2)
  const [panelPersonId, setPanelPersonId] = useState(null)
  const [personFormState, setPersonFormState] = useState(null)

  const canManagePerson =
    userRole === 'owner' || userRole === 'admin' || panelPersonId === linkedPersonId

  const currentPanelPerson = panelPersonId ? getPersonById(panelPersonId) : null

  const handleFocusChange = useCallback(
    (personId) => {
      navigate(personId ? `/tree/${personId}` : '/tree')
    },
    [navigate],
  )

  const closePersonForm = useCallback(() => {
    setPersonFormState(null)
  }, [])

  const refreshTreePeople = useCallback(async () => {
    if (!treeId) return
    await fetchPersons(treeId)
  }, [fetchPersons, treeId])

  const handlePersonFormSuccess = useCallback(
    async (savedPerson) => {
      await refreshTreePeople()
      closePersonForm()

      if (savedPerson?.id) {
        setPanelPersonId(savedPerson.id)
        handleFocusChange(savedPerson.id)
      }
    },
    [closePersonForm, handleFocusChange, refreshTreePeople],
  )

  const openEditPerson = useCallback(() => {
    if (!currentPanelPerson) return

    setPersonFormState({
      mode: 'edit',
      initialData: currentPanelPerson,
      heading: 'Edit profile',
      description: 'Update this person’s details, notes, photo, and history.',
      submitLabel: 'Save Changes',
    })
  }, [currentPanelPerson])

  const openRelationForm = useCallback(
    (type) => {
      if (!currentPanelPerson) return

      const relationLabel =
        type === 'child'
          ? 'Add child'
          : type === 'father'
            ? 'Add father'
            : type === 'mother'
              ? 'Add mother'
              : 'Add sibling'

      setPersonFormState({
        mode: 'add',
        prefilledRelation: { type, relatedPersonId: currentPanelPerson.id },
        heading: relationLabel,
        description: 'Create a new family node and link it to the selected person.',
        submitLabel: 'Add Person',
      })
    },
    [currentPanelPerson],
  )

  const openStandalonePersonForm = useCallback(() => {
    setPersonFormState({
      mode: 'add',
      heading: 'Add person',
      description:
        'Create a standalone person now, then connect them to parents, siblings, or a spouse later.',
      submitLabel: 'Add Person',
    })
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  if (!treeId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">No family tree</h1>
          <p className="mt-3 text-sm text-gray-600">
            Accept an invitation or create a family tree to continue.
          </p>
          <Link
            to="/onboarding"
            className="mt-6 inline-block w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white text-center"
          >
            Go to onboarding
          </Link>
        </div>
      </div>
    )
  }

  if (!personsLoading && Object.keys(persons).length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Your tree is empty</h1>
            <p className="mt-3 text-sm text-gray-600">
              Start with a standalone person, then connect parents, siblings, or a spouse later.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" onClick={openStandalonePersonForm}>
              Add person
            </Button>
            <Link
              to="/invite/link-profile"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Link profile
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-gray-500">
            You can connect this person to relatives after saving.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Click a person node to open profile actions. Use Add Person to create someone without
          choosing a relation first, or use the relation actions to connect new relatives.
        </p>
        <Button type="button" size="sm" onClick={openStandalonePersonForm}>
          Add person
        </Button>
      </div>
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
        canManagePerson={canManagePerson}
        onEdit={openEditPerson}
        onAddRelation={openRelationForm}
        onFocusInGraph={(personId) => {
          setPanelPersonId(null)
          handleFocusChange(personId)
        }}
      />

      {personFormState && (
        <PersonForm
          mode={personFormState.mode}
          treeId={treeId}
          initialData={personFormState.initialData}
          prefilledRelation={personFormState.prefilledRelation}
          heading={personFormState.heading}
          description={personFormState.description}
          submitLabel={personFormState.submitLabel}
          onSuccess={handlePersonFormSuccess}
          onClose={closePersonForm}
        />
      )}
    </div>
  )
}
