import { useEffect, useMemo, useRef, useState } from 'react'
import { genreLean } from '../lib/suggestion'
import { type ClubState, type Genre, GENRES } from '../types'
import { Card, CardTitle, Chip, Subhead } from './ui'

function GenreTag({ children }: { children: string }) {
  return (
    <span className="inline-flex min-h-8 items-center rounded-full border border-burgundy/20 bg-paper px-3 py-1 text-sm text-ink">
      {children}
    </span>
  )
}

export function GenreVotes({
  uid,
  members,
  votes,
  onSave,
}: {
  uid: string
  members: ClubState['members']
  votes: Record<string, Genre[]>
  onSave: (genres: Genre[]) => Promise<void>
}) {
  const live = votes[uid] ?? []
  const [edited, setEdited] = useState(false)
  const [mine, setMine] = useState<Genre[]>(live)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const shown = edited ? mine : live
  const clubPicks = members.filter((member) => (votes[member.id] ?? []).length > 0)
  const lean = useMemo(() => genreLean(votes), [votes])
  const onSaveRef = useRef(onSave)
  const timerRef = useRef<number | null>(null)
  const pendingRef = useRef<Genre[] | null>(null)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      const pending = pendingRef.current
      if (pending) void onSaveRef.current(pending)
    }
  }, [])

  function toggle(genre: Genre) {
    const current = edited ? mine : live
    const next = current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]
    setEdited(true)
    setMine(next)
    setStatus('saving')
    pendingRef.current = next
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const saved = pendingRef.current
      pendingRef.current = null
      timerRef.current = null
      if (!saved) return
      onSaveRef
        .current(saved)
        .then(() => setStatus('saved'))
        .catch(() => {
          setEdited(false)
          setMine(live)
          setStatus('idle')
        })
    }, 400)
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Genres</CardTitle>
      <div>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <Chip key={genre} selected={shown.includes(genre)} onClick={() => toggle(genre)}>
              {genre}
            </Chip>
          ))}
        </div>
        {status !== 'idle' ? (
          <p className="mt-2 text-xs text-ink/60">
            {status === 'saving' && 'Saving…'}
            {status === 'saved' && 'Saved.'}
          </p>
        ) : null}
      </div>
      {lean.length > 0 ? (
        <div>
          <Subhead>Lean</Subhead>
          <div className="flex flex-wrap gap-2">
            {lean.map(({ genre, count }) => (
              <span
                key={genre}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-gold/40 bg-cream/90 px-3 py-1 text-sm"
              >
                <span className="font-medium text-ink">{genre}</span>
                <span className="tabular-nums text-burgundy">{count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {clubPicks.length > 0 ? (
        <div>
          <Subhead>Who wants what</Subhead>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {clubPicks.map((member) => {
              const genres = votes[member.id] ?? []
              return (
                <li
                  key={member.id}
                  className="rounded-xl border border-rule/90 bg-cream/70 px-3.5 py-3"
                >
                  <p className="mb-2 text-sm font-semibold text-ink">
                    {member.displayName}
                    {member.id === uid ? ' (you)' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {genres.map((genre) => (
                      <GenreTag key={genre}>{genre}</GenreTag>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </Card>
  )
}
