import {useState} from 'react'
import {type ClubState, type Genre, GENRES} from '../types'
import {Card, CardTitle, Chip, Subhead} from './ui'

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
        <Card className="flex flex-col gap-4">
            <CardTitle>Favorite genres</CardTitle>
            <div>
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
                {status !== 'idle' ? (
                    <p className="mt-2 text-xs text-ink/60">
                        {status === 'saving' && 'Saving…'}
                        {status === 'saved' && 'Saved.'}
                    </p>
                ) : null}
            </div>
            {clubPicks.length > 0 ? (
                <div>
                    <Subhead>What the club wants</Subhead>
                    <ul className="flex flex-col gap-1.5 text-sm">
                        {clubPicks.map((member) => {
                            const genres = votes[member.id] ?? []
                            return (
                                <li
                                    key={member.id}
                                    className="rounded-xl border-l-2 border-gold bg-cream px-3 py-2"
                                >
                                    <span className="font-semibold">
                                        {member.displayName}
                                        {member.id === uid ? ' (you)' : ''}
                                    </span>
                                    <span className="text-ink/70"> — {genres.join(', ')}</span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ) : null}
        </Card>
    )
}
