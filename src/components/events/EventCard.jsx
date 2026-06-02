import { format } from 'date-fns'
import Badge from '../ui/Badge'

function getInitials(firstName, lastName) {
  const first = firstName?.charAt(0) ?? ''
  const last = lastName?.charAt(0) ?? ''
  return (first + last).toUpperCase() || '?'
}

function getFullName(person) {
  return [person?.first_name, person?.last_name].filter(Boolean).join(' ') || 'Unknown'
}

function PersonAvatar({ person, photoUrl, className = '' }) {
  const isMale = person?.gender === 'male'
  const isFemale = person?.gender === 'female'

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-white/60 text-sm font-semibold ${
        isMale ? 'rounded-md' : isFemale ? 'rounded-full' : 'rounded-lg'
      } ${className}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(person?.first_name, person?.last_name)
      )}
    </div>
  )
}

function DaysBadge({ daysUntil }) {
  const label =
    daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`

  return (
    <Badge variant="default" className="bg-white/80 text-gray-800 shadow-sm">
      {label}
    </Badge>
  )
}

function BirthdayCard({ event, photoUrl, onClick }) {
  const name = getFullName(event.person)
  const ageLabel = event.approximate
    ? `Turns ~${event.age_turning}`
    : `Turns ${event.age_turning}`

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <PersonAvatar person={event.person} photoUrl={photoUrl} className="h-14 w-14" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Birthday 🎂
            </p>
            <h3 className="text-lg font-bold text-gray-900">{name}</h3>
            <p className="text-sm font-medium text-amber-800">{ageLabel}</p>
          </div>
          <DaysBadge daysUntil={event.daysUntil} />
        </div>
        <p className="mt-2 text-sm text-amber-900/80">
          {format(event.date, 'd MMMM')}
        </p>
      </div>
    </button>
  )
}

function AnniversaryCard({ event, photoUrls, onClick }) {
  const name1 = getFullName(event.partner1)
  const name2 = getFullName(event.partner2)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-violet-100 p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex shrink-0 -space-x-3">
        <PersonAvatar
          person={event.partner1}
          photoUrl={photoUrls?.[event.partner1?.id]}
          className="h-12 w-12 border-2 border-purple-100"
        />
        <PersonAvatar
          person={event.partner2}
          photoUrl={photoUrls?.[event.partner2?.id]}
          className="h-12 w-12 border-2 border-purple-100"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Anniversary 💍
            </p>
            <h3 className="text-lg font-bold text-gray-900">
              {name1} & {name2}
            </h3>
            <p className="text-sm font-medium text-purple-800">
              {event.years_together} Years Together
            </p>
          </div>
          <DaysBadge daysUntil={event.daysUntil} />
        </div>
        <p className="mt-2 text-sm text-purple-900/80">
          {format(event.date, 'd MMMM')}
        </p>
      </div>
    </button>
  )
}

function MemorialCard({ event, photoUrl, onClick }) {
  const name = getFullName(event.person)
  const yearsLabel = event.approximate
    ? `~${event.years_since} Years Since`
    : `${event.years_since} Years Since`

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <PersonAvatar
        person={event.person}
        photoUrl={photoUrl}
        className="h-14 w-14 opacity-90"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Memorial 🕯
            </p>
            <h3 className="text-lg font-bold text-gray-800">{name}</h3>
            <p className="text-sm text-slate-600">{yearsLabel}</p>
          </div>
          <DaysBadge daysUntil={event.daysUntil} />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {format(event.date, 'd MMMM')}
        </p>
      </div>
    </button>
  )
}

export default function EventCard({ event, photoUrls = {}, onPersonClick, onAnniversaryClick }) {
  if (event.type === 'birthday') {
    return (
      <BirthdayCard
        event={event}
        photoUrl={photoUrls[event.person?.id]}
        onClick={() => onPersonClick?.(event.person?.id)}
      />
    )
  }

  if (event.type === 'anniversary') {
    return (
      <AnniversaryCard
        event={event}
        photoUrls={photoUrls}
        onClick={() =>
          onAnniversaryClick?.(event.partner1?.id, event.partner2?.id)
        }
      />
    )
  }

  if (event.type === 'memorial') {
    return (
      <MemorialCard
        event={event}
        photoUrl={photoUrls[event.person?.id]}
        onClick={() => onPersonClick?.(event.person?.id)}
      />
    )
  }

  return null
}
