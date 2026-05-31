import { useEffect, useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import Button from '../ui/Button'
import { getFullName, getOccupationClue, GAME_MODES } from '../../lib/flashcardUtils'

function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0) ?? ''
  const last = lastName?.charAt(0) ?? ''
  return (first + last).toUpperCase() || '?'
}

function PhotoAvatar({ person, photoUrl, large = false }) {
  const size = large ? 'h-40 w-40' : 'h-32 w-32'

  return (
    <div
      className={`mx-auto flex ${size} items-center justify-center overflow-hidden rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-300 shadow-inner`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(person?.first_name, person?.last_name)
      )}
    </div>
  )
}

function FaceToNameFront({ person, photoUrl }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <PhotoAvatar person={person} photoUrl={photoUrl} large />
      <p className="text-sm text-gray-500">Who is this?</p>
    </div>
  )
}

function FaceToNameBack({ person, relationshipLabel, informalLabel }) {
  return (
    <div className="space-y-2 text-center">
      <h3 className="text-2xl font-bold text-gray-900">{getFullName(person)}</h3>
      {person.nickname && (
        <p className="text-lg italic text-gray-600">&ldquo;{person.nickname}&rdquo;</p>
      )}
      <p className="text-indigo-700">{relationshipLabel}</p>
      {informalLabel && <p className="text-indigo-500">{informalLabel}</p>}
    </div>
  )
}

function ClueToPersonFront({ person }) {
  return (
    <div className="space-y-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Clues</p>
      <p className="text-xl font-semibold text-gray-900">{getOccupationClue(person)}</p>
      <p className="text-lg text-gray-700">{person.city || 'City not recorded'}</p>
    </div>
  )
}

function ClueToPersonBack({ person, photoUrl, relationshipLabel, informalLabel }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <PhotoAvatar person={person} photoUrl={photoUrl} />
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">{getFullName(person)}</h3>
        <p className="text-indigo-700">{relationshipLabel}</p>
        {informalLabel && <p className="text-sm text-indigo-500">{informalLabel}</p>}
      </div>
    </div>
  )
}

function NameToRelationFront({ person }) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Name</p>
      <h3 className="mt-4 text-3xl font-bold text-gray-900">{getFullName(person)}</h3>
      {person.nickname && (
        <p className="mt-2 text-lg italic text-gray-600">&ldquo;{person.nickname}&rdquo;</p>
      )}
    </div>
  )
}

function NameToRelationBack({ relationshipLabel, informalLabel }) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        Relationship to you
      </p>
      <p className="text-2xl font-bold text-indigo-800">{relationshipLabel}</p>
      {informalLabel && (
        <p className="text-xl text-indigo-600">{informalLabel}</p>
      )}
    </div>
  )
}

function BirthdayChallengeFront({ person, photoUrl }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <PhotoAvatar person={person} photoUrl={photoUrl} large />
      <h3 className="text-2xl font-bold text-gray-900">{getFullName(person)}</h3>
      <p className="text-sm text-gray-500">What month were they born?</p>
    </div>
  )
}

function BirthdayChallengeBack({ person }) {
  const parsed = person.birth_date ? parseISO(person.birth_date) : null
  const month =
    parsed && isValid(parsed)
      ? `${person.birth_date_approx ? '~' : ''}${format(parsed, 'MMMM')}`
      : 'Unknown'

  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Birth month</p>
      <p className="mt-4 text-4xl font-bold text-indigo-800">{month}</p>
    </div>
  )
}

export default function FlashcardCard({
  person,
  mode,
  photoUrl,
  relationshipLabel,
  informalLabel,
  onCorrect,
  onMissed,
}) {
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    setFlipped(false)
  }, [person?.id, mode])

  const renderFront = () => {
    switch (mode) {
      case GAME_MODES.FACE_TO_NAME:
        return <FaceToNameFront person={person} photoUrl={photoUrl} />
      case GAME_MODES.CLUE_TO_PERSON:
        return <ClueToPersonFront person={person} />
      case GAME_MODES.NAME_TO_RELATION:
        return <NameToRelationFront person={person} />
      case GAME_MODES.BIRTHDAY_CHALLENGE:
        return <BirthdayChallengeFront person={person} photoUrl={photoUrl} />
      default:
        return null
    }
  }

  const renderBack = () => {
    switch (mode) {
      case GAME_MODES.FACE_TO_NAME:
        return (
          <FaceToNameBack
            person={person}
            relationshipLabel={relationshipLabel}
            informalLabel={informalLabel}
          />
        )
      case GAME_MODES.CLUE_TO_PERSON:
        return (
          <ClueToPersonBack
            person={person}
            photoUrl={photoUrl}
            relationshipLabel={relationshipLabel}
            informalLabel={informalLabel}
          />
        )
      case GAME_MODES.NAME_TO_RELATION:
        return (
          <NameToRelationBack
            relationshipLabel={relationshipLabel}
            informalLabel={informalLabel}
          />
        )
      case GAME_MODES.BIRTHDAY_CHALLENGE:
        return <BirthdayChallengeBack person={person} />
      default:
        return null
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="[perspective:1200px]">
        <div
          className={`relative min-h-[320px] w-full transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-md [backface-visibility:hidden]">
            {renderFront()}
            {!flipped && (
              <Button
                type="button"
                className="mt-8"
                onClick={() => setFlipped(true)}
              >
                Reveal Answer
              </Button>
            )}
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {renderBack()}
            <div className="mt-8 flex w-full gap-3">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={onMissed}
              >
                Missed ❌
              </Button>
              <Button type="button" className="flex-1" onClick={onCorrect}>
                Got it ✅
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
