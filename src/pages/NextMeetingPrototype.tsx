import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PrototypeSwitcher, type PrototypeVariant } from '../components/PrototypeSwitcher'
import { Button, Card, CardTitle } from '../components/ui'

// Three ways to set the next meeting, on /prototype/next-meeting.
// Sample club card, no sign-in. PROTOTYPE, throwaway.

const VARIANTS: PrototypeVariant[] = [
  { id: 'A', name: 'Line on the card' },
  { id: 'B', name: 'Inside members' },
  { id: 'C', name: 'Big date' },
]

type When = 'upcoming' | 'passed' | 'empty'
type Role = 'owner' | 'member'

function readWhen(value: string | null): When {
  if (value === 'passed' || value === 'empty') return value
  return 'upcoming'
}

function meetingFor(when: When): Date | null {
  if (when === 'empty') return null
  const date = new Date()
  date.setDate(date.getDate() + (when === 'passed' ? -3 : 4))
  date.setHours(19, 0, 0, 0)
  return date
}

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function dateInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function NextMeetingPrototype() {
  const [params, setParams] = useSearchParams()
  const variant = params.get('variant') ?? 'A'
  const role: Role = params.get('role') === 'member' ? 'member' : 'owner'
  const when = readWhen(params.get('when'))
  const [meeting, setMeeting] = useState<Date | null>(() => meetingFor(when))
  const [seenWhen, setSeenWhen] = useState(when)
  if (when !== seenWhen) {
    setSeenWhen(when)
    setMeeting(meetingFor(when))
  }

  function setFlag(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  const passed = meeting != null && meeting.getTime() < Date.now()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-8 pb-28">
      <p className="text-xs font-semibold tracking-wide text-burgundy uppercase">
        Prototype · {role} · {meeting ? (passed ? 'passed' : 'upcoming') : 'empty'} ·{' '}
        {meeting ? formatWhen(meeting) : 'no time'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-full border border-ink/20 px-3 py-2 text-sm font-semibold" onClick={() => setFlag('role', role === 'owner' ? 'member' : 'owner')}>
          View as {role === 'owner' ? 'member' : 'owner'}
        </button>
        {(['upcoming', 'passed', 'empty'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className="rounded-full border border-ink/20 px-3 py-2 text-sm font-semibold"
            onClick={() => setFlag('when', value)}
          >
            {value}
          </button>
        ))}
      </div>
      <Card className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>Club</CardTitle>
          <Button type="button" variant="ghost" size="sm">
            Copy invite
          </Button>
        </div>
        {variant === 'C' ? (
          <BigDate role={role} meeting={meeting} passed={passed} onChange={setMeeting} />
        ) : null}
        {variant === 'A' ? (
          <LineOnCard role={role} meeting={meeting} passed={passed} onChange={setMeeting} />
        ) : null}
        <details className="group" open={variant === 'B'}>
          <summary className="flex list-none items-center justify-between gap-3 text-sm font-semibold outline-none select-none">
            Members & rules
          </summary>
          <div className="mt-4 flex flex-col gap-5">
            <p className="text-sm">Nick · owner · Sam · Jordan</p>
            <p className="text-sm text-ink/70">One rule is written here.</p>
            {variant === 'B' ? (
              <InsideMembers role={role} meeting={meeting} passed={passed} onChange={setMeeting} />
            ) : null}
          </div>
        </details>
      </Card>
      <PrototypeSwitcher variants={VARIANTS} />
    </main>
  )
}

function LineOnCard({
  role,
  meeting,
  passed,
  onChange,
}: {
  role: Role
  meeting: Date | null
  passed: boolean
  onChange: (date: Date) => void
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-rule pb-4">
      <p className="text-sm font-semibold">Next meeting</p>
      <p className="font-display text-lg leading-tight">
        {meeting ? formatWhen(meeting) : 'No next meeting yet'}
      </p>
      {passed ? <p className="text-sm text-burgundy">This meeting has passed.</p> : null}
      {role === 'owner' ? <WhenField meeting={meeting} onChange={onChange} /> : null}
    </div>
  )
}

function InsideMembers({
  role,
  meeting,
  passed,
  onChange,
}: {
  role: Role
  meeting: Date | null
  passed: boolean
  onChange: (date: Date) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-xl">Next meeting</h3>
      <p>{meeting ? formatWhen(meeting) : 'No next meeting yet'}</p>
      {passed ? <p className="text-sm text-burgundy">This meeting has passed. Set the following one.</p> : null}
      {role === 'owner' ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            Date
            <input
              type="date"
              className="rounded-lg border border-rule bg-cream px-2 py-2"
              value={meeting ? dateInputValue(meeting).slice(0, 10) : ''}
              onChange={(event) => {
                const time = meeting ? dateInputValue(meeting).slice(11) : '19:00'
                const next = new Date(`${event.target.value}T${time}`)
                if (!Number.isNaN(next.getTime())) onChange(next)
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Time
            <input
              type="time"
              className="rounded-lg border border-rule bg-cream px-2 py-2"
              value={meeting ? dateInputValue(meeting).slice(11) : '19:00'}
              onChange={(event) => {
                const day = meeting ? dateInputValue(meeting).slice(0, 10) : dateInputValue(new Date()).slice(0, 10)
                const next = new Date(`${day}T${event.target.value}`)
                if (!Number.isNaN(next.getTime())) onChange(next)
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}

function BigDate({
  role,
  meeting,
  passed,
  onChange,
}: {
  role: Role
  meeting: Date | null
  passed: boolean
  onChange: (date: Date) => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="rounded-2xl bg-cream px-4 py-5">
      <p className="text-xs font-semibold tracking-wide text-gold uppercase">Next meeting</p>
      {meeting ? (
        <>
          <p className="mt-1 font-display text-4xl leading-none">
            {new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(meeting)}
          </p>
          <p className="mt-2 text-sm text-ink/70">
            {new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(meeting)}
            {passed ? ' · passed' : ''}
          </p>
        </>
      ) : (
        <p className="mt-2 font-display text-3xl">No date yet</p>
      )}
      {role === 'owner' ? (
        <button type="button" className="mt-3 text-sm font-semibold text-burgundy" onClick={() => setEditing((open) => !open)}>
          {editing ? 'Done' : meeting ? 'Change' : 'Set the next meeting'}
        </button>
      ) : null}
      {role === 'owner' && editing ? <WhenField meeting={meeting} onChange={onChange} /> : null}
    </div>
  )
}

function WhenField({ meeting, onChange }: { meeting: Date | null; onChange: (date: Date) => void }) {
  return (
    <label className="mt-2 flex flex-col gap-1 text-sm">
      Date and time
      <input
        type="datetime-local"
        className="rounded-lg border border-rule bg-paper px-2 py-2"
        value={meeting ? dateInputValue(meeting) : ''}
        onChange={(event) => {
          const next = new Date(event.target.value)
          if (!Number.isNaN(next.getTime())) onChange(next)
        }}
      />
    </label>
  )
}
