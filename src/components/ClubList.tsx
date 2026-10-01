import { Link } from 'react-router-dom'
import type { JoinedClub } from '../types'
import { Cover } from './ui'

export function ClubList({ clubs, empty }: { clubs: JoinedClub[]; empty: string }) {
  if (clubs.length === 0) {
    return <p className="text-sm text-ink/65">{empty}</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {clubs.map((club) => (
        <li key={club.code}>
          <Link
            to={`/club/${club.code}`}
            className="flex min-h-14 min-w-0 w-full items-center gap-3 overflow-hidden rounded-xl border border-rule/90 bg-cream/80 px-3 py-3 transition hover:border-burgundy/70 hover:bg-paper hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy active:bg-rule/30"
          >
            {club.currentBook ? (
              <Cover
                src={club.currentBook.coverUrl}
                title={club.currentBook.title}
                className="h-16 w-11"
              />
            ) : (
              <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-lg bg-burgundy/15 text-center font-display text-[10px] leading-tight text-burgundy">
                Club
              </div>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{club.name}</span>
              <span className="block truncate text-sm text-ink/70">
                {club.currentBook?.title ?? 'No current book'}
              </span>
              <span className="block text-xs text-ink/50">
                {club.role === 'owner' ? 'Owner' : 'Member'}
                {' · '}
                {club.code}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
