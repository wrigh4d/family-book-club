import {useState} from 'react'
import {currentHistoryBook, rateCurrentBook, resolveCurrentBook, savePersonalNote} from '../lib/store'
import {useBookFacts} from '../lib/useBookFacts'
import type {ClubState} from '../types'
import {Button, Card, CardTitle, Cover, Subhead, TextArea} from './ui'

export function CurrentBookCard({
    code,
    uid,
    state,
    onError,
}: {
    code: string
    uid: string
    state: ClubState
    onError: (err: unknown) => void
}) {
    const current = resolveCurrentBook(state)
    const history = currentHistoryBook(state)
    const myRating = history?.ratings[uid]
    const remoteNote = history?.notes?.[uid] ?? ''
    const [draft, setDraft] = useState<string | null>(null)
    const note = draft ?? remoteNote
    const facts = useBookFacts(current)

    if (!current) {
        return (
            <Card className="flex flex-col gap-4">
                <CardTitle>Current book</CardTitle>
                <p className="text-sm text-ink/70">None yet. The owner will pick one after presenting.</p>
            </Card>
        )
    }

    return (
        <Card className="flex flex-col gap-4">
            <CardTitle>Current book</CardTitle>
            <div className="flex gap-3">
                <Cover
                    src={current.coverUrl}
                    title={current.title}
                    loading="eager"
                    className="h-36 w-24 ring-1 ring-gold/40"
                />
                <div>
                    <p className="font-display text-xl">{current.title}</p>
                    <p className="text-sm text-ink/70">{current.author}</p>
                    {facts ? <p className="mt-1 text-sm text-ink/60">{facts}</p> : null}
                </div>
            </div>
            <div>
                <Subhead>Your rating</Subhead>
                <div className="flex gap-2" role="group" aria-label="Rate the current book">
                    {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                            key={stars}
                            type="button"
                            aria-label={`Rate ${stars} out of 5`}
                            aria-pressed={myRating === stars}
                            className={`h-11 w-11 rounded-full border transition duration-150 ${
                                myRating === stars
                                    ? 'border-burgundy bg-burgundy text-cream hover:bg-burgundy-dark'
                                    : 'border-rule bg-cream hover:border-burgundy hover:bg-burgundy/10'
                            }`}
                            onClick={() => rateCurrentBook(code, state, uid, stars).catch(onError)}
                        >
                            {stars}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <Subhead>Your note</Subhead>
                <TextArea
                    value={note}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="A thought for the meeting — optional"
                    aria-label="Your note on the current book"
                />
                <div className="mt-2 flex justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => savePersonalNote(code, state, uid, note).catch(onError)}
                    >
                        Save note
                    </Button>
                </div>
            </div>
        </Card>
    )
}
