import {Link} from 'react-router-dom'
import type {JoinedClub} from '../types'
import {Cover} from './ui'

export function ClubList({
    clubs,
    empty,
}: {
    clubs: JoinedClub[]
    empty: string
}) {
    if (clubs.length === 0) {
        return <p className="text-sm text-ink/70">{empty}</p>
    }

    return (
        <ul className="flex flex-col gap-2">
            {clubs.map((club) => (
                <li key={club.code}>
                    <Link
                        to={`/club/${club.code}`}
                        className="flex items-center gap-3 rounded-xl border border-rule bg-cream px-3 py-3 transition hover:border-burgundy hover:shadow-sm"
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
                            <span className="block font-semibold">{club.name}</span>
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
