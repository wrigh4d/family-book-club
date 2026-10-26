import { useMemo } from 'react'
import { genreLean } from '../lib/suggestion'
import type { Genre } from '../types'

export function GenrePreferenceChips({ votes }: { votes: Record<string, Genre[]> }) {
  const counts = useMemo(() => genreLean(votes), [votes])
  if (counts.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-ink/85">Club genre preferences</p>
      <div className="flex flex-wrap gap-1.5">
        {counts.map(({ genre, count }) => (
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
  )
}
