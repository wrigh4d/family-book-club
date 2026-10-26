import { useEffect, useState } from 'react'
import { TextButton } from './ui'

function useClock(): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const kick = window.setTimeout(tick, 0)
    const id = window.setInterval(tick, 30_000)
    return () => {
      window.clearTimeout(kick)
      window.clearInterval(id)
    }
  }, [])
  return now
}

function formatClock(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(at)
}

function formatDay(at: number): string {
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(at)
}

function dateInputValue(at: number): string {
  const date = new Date(at)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function NextMeeting({
  at,
  owner,
  busy,
  onSet,
}: {
  at: number | null
  owner: boolean
  busy: boolean
  onSet: (at: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const now = useClock()
  const passed = at != null && now != null && at < now

  return (
    <div className="rounded-2xl bg-cream px-4 py-5">
      <p className="text-xs font-semibold tracking-wide text-gold uppercase">Next meeting</p>
      {at != null ? (
        <>
          <p className="mt-1 font-display text-4xl leading-none">{formatClock(at)}</p>
          <p className="mt-2 text-sm text-ink/70">
            {formatDay(at)}
            {passed ? ' · passed' : ''}
          </p>
        </>
      ) : (
        <p className="mt-2 font-display text-3xl">No date yet</p>
      )}
      {owner ? (
        <TextButton className="mt-3" disabled={busy} onClick={() => setEditing((open) => !open)}>
          {editing ? 'Done' : at != null ? 'Change' : 'Set the next meeting'}
        </TextButton>
      ) : null}
      {owner && editing ? (
        <label className="mt-3 flex flex-col gap-1 text-sm">
          Date and time
          <input
            type="datetime-local"
            className="rounded-lg border border-rule bg-paper px-2 py-2"
            value={at != null ? dateInputValue(at) : ''}
            disabled={busy}
            onChange={(event) => {
              const next = new Date(event.target.value).getTime()
              if (Number.isFinite(next) && next > 0) onSet(next)
            }}
          />
        </label>
      ) : null}
    </div>
  )
}
