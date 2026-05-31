import { useCallback, useEffect, useMemo, useState } from 'react'
import { computeRelationship } from '../../lib/relationshipEngine'
import {
  buildDeck,
  filterGamePersons,
  loadMissedPersonIds,
  saveMissedPersonIds,
} from '../../lib/flashcardUtils'
import FlashcardCard from './FlashcardCard'
import Button from '../ui/Button'

function EndScreen({
  correctGuesses,
  cardsShown,
  streak,
  missedCount,
  onPlayAgain,
  onChangeMode,
}) {
  const accuracy = cardsShown > 0 ? Math.round((correctGuesses / cardsShown) * 100) : 0

  let message = 'Great effort — every round strengthens your family memory!'
  if (accuracy >= 90) message = 'Outstanding! You really know your family.'
  else if (accuracy >= 70) message = 'Well done! You are getting stronger with each round.'
  else if (accuracy >= 50) message = 'Good progress — keep practicing the ones you missed.'
  else if (missedCount > 0) {
    message = 'Those missed cards will appear more often until you know them cold.'
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">Round Complete!</h2>
      <p className="mt-2 text-4xl font-bold text-indigo-600">
        {correctGuesses} / {cardsShown}
      </p>
      <p className="mt-1 text-sm text-gray-500">correct answers</p>
      <p className="mt-1 text-sm text-gray-500">Best streak: {streak}</p>
      <p className="mt-6 text-sm leading-relaxed text-gray-600">{message}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button type="button" onClick={onPlayAgain}>
          Play Again
        </Button>
        <Button type="button" variant="secondary" onClick={onChangeMode}>
          Change Mode
        </Button>
      </div>
    </div>
  )
}

export default function FlashcardGame({
  mode,
  branchFilter,
  persons,
  unions,
  rootPersonId,
  photoUrls,
  onChangeMode,
}) {
  const [missedPersonIds, setMissedPersonIds] = useState(() => loadMissedPersonIds())
  const [deck, setDeck] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardsShown, setCardsShown] = useState(0)
  const [correctGuesses, setCorrectGuesses] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [finished, setFinished] = useState(false)

  const eligiblePersons = useMemo(
    () =>
      filterGamePersons({
        persons,
        rootPersonId,
        mode,
        branchFilter,
      }),
    [persons, rootPersonId, mode, branchFilter],
  )

  const startGame = useCallback(() => {
    const nextDeck = buildDeck(eligiblePersons, missedPersonIds)
    setDeck(nextDeck)
    setCurrentIndex(0)
    setCardsShown(0)
    setCorrectGuesses(0)
    setStreak(0)
    setBestStreak(0)
    setFinished(nextDeck.length === 0)
  }, [eligiblePersons, missedPersonIds])

  useEffect(() => {
    startGame()
  }, [startGame])

  const currentPerson = deck[currentIndex] ?? null

  const relationship = useMemo(() => {
    if (!currentPerson || !rootPersonId) return null
    return computeRelationship(persons, unions, rootPersonId, currentPerson.id)
  }, [currentPerson, persons, unions, rootPersonId])

  const relationshipLabel = relationship?.formal ?? 'Unknown relationship'
  const informalLabel = relationship?.informal ?? null

  const advance = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= deck.length) {
      setFinished(true)
    } else {
      setCurrentIndex(nextIndex)
    }
  }

  const handleCorrect = () => {
    setCardsShown((count) => count + 1)
    setCorrectGuesses((count) => count + 1)
    setStreak((value) => {
      const next = value + 1
      setBestStreak((best) => Math.max(best, next))
      return next
    })

    if (currentPerson?.id) {
      setMissedPersonIds((prev) => {
        const next = prev.filter((id) => id !== currentPerson.id)
        saveMissedPersonIds(next)
        return next
      })
    }

    advance()
  }

  const handleMissed = () => {
    setCardsShown((count) => count + 1)
    setStreak(0)

    if (currentPerson?.id) {
      setMissedPersonIds((prev) => {
        if (prev.includes(currentPerson.id)) return prev
        const next = [...prev, currentPerson.id]
        saveMissedPersonIds(next)
        return next
      })
    }

    advance()
  }

  if (eligiblePersons.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
        <p className="text-lg font-medium text-gray-700">No cards available</p>
        <p className="mt-2 text-sm text-gray-500">
          Try a different mode or branch filter, or add photos to more family members.
        </p>
        <Button type="button" variant="secondary" className="mt-6" onClick={onChangeMode}>
          Change Mode
        </Button>
      </div>
    )
  }

  if (finished) {
    return (
      <EndScreen
        correctGuesses={correctGuesses}
        cardsShown={cardsShown}
        streak={bestStreak}
        missedCount={missedPersonIds.length}
        onPlayAgain={startGame}
        onChangeMode={onChangeMode}
      />
    )
  }

  const progressTotal = deck.length
  const progressCurrent = cardsShown + 1

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {progressCurrent} / {progressTotal}
          </span>
          <span className="font-medium text-emerald-600">Streak: {streak} 🔥</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${Math.min(100, (progressCurrent / progressTotal) * 100)}%` }}
          />
        </div>
      </div>

      {currentPerson && (
        <FlashcardCard
          key={`${currentPerson.id}-${currentIndex}`}
          person={currentPerson}
          mode={mode}
          photoUrl={photoUrls[currentPerson.id]}
          relationshipLabel={relationshipLabel}
          informalLabel={informalLabel}
          onCorrect={handleCorrect}
          onMissed={handleMissed}
        />
      )}
    </div>
  )
}
