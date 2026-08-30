import {useState} from 'react'
import {type ClubState, type Genre, GENRES} from '../types'
import {Chip} from './ui'

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

    async function toggle(genre: Genre) {
        const current = edited ? mine : live
        const next = current.includes(genre) ? current.filter((g) => g !== genre) : [...current, genre]
        setEdited(true)
        setMine(next)
        setStatus('saving')
        try {
            await onSave(next)
            setStatus('saved')
        } catch {
            setEdited(false)
            setMine(live)
            setStatus('idle')
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div>
                <p className="mb-1 font-semibold">Genres you want this round</p>
                <p className="mb-2 text-sm text-ink/70">
                    Last round’s picks stay selected until this round is locked. Leave them if they still
                    look right, or tap to change. You only edit your own; everyone can see them.
                </p>
                <div className="flex flex-wrap gap-2">
                    {GENRES.map((genre) => (
                        <Chip
                            key={genre}
                            selected={shown.includes(genre)}
                            onClick={() => toggle(genre)}
                        >
                            {genre}
                        </Chip>
                    ))}
                </div>
                <p className="mt-2 text-xs text-ink/60">
                    {status === 'saving' && 'Saving…'}
                    {status === 'saved' && 'Saved. Other members can see this now.'}
                    {status === 'idle' &&
                        shown.length > 0 &&
                        'Carried over from last round. No need to tap unless you want to change.'}
                    {status === 'idle' && shown.length === 0 && 'No genres selected yet.'}
                </p>
            </div>
            <div>
                <p className="mb-2 font-semibold">What the club wants</p>
                <ul className="flex flex-col gap-1.5 text-sm">
                    {members.map((member) => {
                        const genres = votes[member.id] ?? []
                        return (
                            <li key={member.id} className="rounded-xl bg-cream px-3 py-2">
                                <span className="font-semibold">
                                    {member.displayName}
                                    {member.id === uid ? ' (you)' : ''}
                                </span>
                                <span className="text-ink/70">
                                    {genres.length ? ` — ${genres.join(', ')}` : ' — no genres yet'}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    )
}
