import { useEffect, useMemo, useRef, useState } from 'react'
import { genreLean } from '../lib/suggestion'
import { type Genre, GENRES } from '../types'
import { Card, CardTitle, Chip, Subhead } from './ui'

export function GenreVotes({
  uid,
  votes,
  onSave,
}: {
  uid: string
  votes: Record<string, Genre[]>
  onSave: (genres: Genre[]) => Promise<void>
}) {
  const live = votes[uid] ?? []
  const [edited, setEdited] = useState(false)
  const [mine, setMine] = useState<Genre[]>(live)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const shown = edited ? mine : live
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
        <div className="flex flex-col gap-1.5">
          <Subhead>Lean</Subhead>
          <div className="flex flex-wrap gap-1.5">
            {lean.map(({ genre, count }) => (
              <span
                key={genre}
                className="inline-flex min-h-7 items-center gap-1 rounded-full border border-gold/40 bg-cream/90 px-2.5 py-0.5 text-xs"
              >
                <span className="font-medium text-ink">{genre}</span>
                <span className="tabular-nums text-burgundy">{count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
