import {Link, Navigate, useNavigate, useParams} from 'react-router-dom'
import {Button, Cover, ErrorBanner} from '../components/ui'
import {friendlyFirebaseError} from '../lib/errors'
import {meetingRecsFromRound} from '../lib/recs'
import {
    currentHistoryBook,
    isOwner,
    personalNotes,
    resolveCurrentBook,
    startConcluding,
} from '../lib/store'
import {genreLean} from '../lib/suggestion'
import {useClub} from '../lib/useClub'
import type {AppRecommendation, ClubState} from '../types'

export function Present() {
    const {code: rawCode = ''} = useParams()
    const {code, uid, displayName, ready, state, error, setError} = useClub(rawCode)
    const navigate = useNavigate()
    const lean = state ? genreLean(state.genreVotes) : []
    const recs = meetingRecsFromRound(state)
    const current = state ? resolveCurrentBook(state) : null
    const history = state ? currentHistoryBook(state) : null
    const owner = state && uid ? isOwner(state, uid) : false

    if (ready && !displayName) {
        return <Navigate to={`/club/${code}`} replace/>
    }

    if (!ready || !state) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-ink px-4 text-cream">
                <p>{error ?? 'Opening presenting mode…'}</p>
            </div>
        )
    }

    if (!current) {
        return <Navigate to={`/club/${code}`} replace/>
    }

    const ratings = history ? Object.values(history.ratings) : []
    const ratingLabel = ratings.length
        ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)}/5`
        : 'none yet'

    return (
        <div className="min-h-dvh bg-ink px-4 py-6 text-cream sm:px-10 sm:py-10">
            <div className="mx-auto flex max-w-4xl flex-col gap-8">
                <header className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-gold">Family Book Club</p>
                        <h1 className="font-display text-4xl sm:text-6xl">{state.club.name}</h1>
                    </div>
                    <Link
                        className="text-sm text-gold underline decoration-gold/40 underline-offset-2 transition hover:text-cream hover:decoration-cream"
                        to={`/club/${code}`}
                    >
                        Back
                    </Link>
                </header>
                <ErrorBanner message={error}/>

                <section className="rounded-3xl bg-burgundy p-5 sm:p-8">
                    <p className="text-sm uppercase tracking-[0.2em] text-gold">Current book</p>
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                        <Cover
                            src={current.coverUrl}
                            title={current.title}
                            className="h-48 w-32 sm:h-64 sm:w-44"
                            loading="eager"
                        />
                        <div>
                            <h2 className="font-display text-3xl sm:text-5xl">{current.title}</h2>
                            <p className="mt-1 text-lg text-cream/80">{current.author}</p>
                            {history ? (
                                <p className="mt-3 text-lg">Ratings: {ratingLabel}</p>
                            ) : null}
                        </div>
                    </div>
                </section>
                <NoteTicker notes={personalNotes(state)}/>

                <section>
                    <h2 className="mb-2 font-display text-2xl text-gold">Rules</h2>
                    {state.rules.length === 0 ? (
                        <p className="text-cream/70">No rules added yet.</p>
                    ) : (
                        <ol className="flex list-decimal flex-col gap-1 pl-5 text-lg">
                            {state.rules.map((rule) => (
                                <li key={rule.id}>{rule.text}</li>
                            ))}
                        </ol>
                    )}
                </section>

                <section>
                    <h2 className="mb-2 font-display text-2xl text-gold">This round leans</h2>
                    {lean.length === 0 ? (
                        <p className="text-cream/70">No genre votes yet.</p>
                    ) : (
                        <p className="font-display text-2xl sm:text-3xl">
                            {lean.map((row) => `${row.genre} (${row.count})`).join(' · ')}
                        </p>
                    )}
                </section>

                <ShortlistTicker books={state.nominations}/>

                <PresentRec label="Most popular in this round’s genre" rec={recs.genre}/>
                <PresentRec label="From past club ratings" rec={recs.ratings}/>

                {owner && uid ? (
                    <Button
                        type="button"
                        onClick={() =>
                            startConcluding(code, state, uid)
                                .then(() => navigate(`/club/${code}`))
                                .catch((err) => setError(friendlyFirebaseError(err)))
                        }
                    >
                        Conclude meeting
                    </Button>
                ) : null}
            </div>
        </div>
    )
}

function ShortlistTicker({books}: {books: ClubState['nominations']}) {
    if (books.length === 0) return null
    const loop = books.length === 1 ? books : [...books, ...books]
    return (
        <section className="shortlist-ticker rounded-3xl border border-gold/40 py-4">
            <p className="mb-3 px-5 text-sm uppercase tracking-[0.2em] text-gold">Shortlist</p>
            <div className={books.length > 1 ? 'shortlist-ticker-track' : 'flex justify-center gap-6 px-5'}>
                {loop.map((book, index) => (
                    <div
                        key={`${book.id}-${index}`}
                        className="flex w-36 shrink-0 flex-col items-center gap-2 px-2"
                    >
                        <Cover src={book.coverUrl} title={book.title} className="h-40 w-28"/>
                        <p className="line-clamp-2 text-center font-display text-sm">{book.title}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}

function PresentRec({
    label,
    rec,
}: {
    label: string
    rec: AppRecommendation | null
}) {
    if (!rec) return null
    return (
        <section className="rounded-3xl border border-gold/40 p-5 sm:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-gold">{label}</p>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
                <Cover
                    src={rec.coverUrl}
                    title={rec.title}
                    className="h-40 w-28 sm:h-52 sm:w-36"
                />
                <div>
                    <h3 className="font-display text-3xl sm:text-4xl">{rec.title}</h3>
                    <p className="mt-1 text-lg text-cream/80">{rec.author}</p>
                    <p className="mt-4 max-w-xl text-lg">{rec.why}</p>
                </div>
            </div>
        </section>
    )
}

function NoteTicker({
    notes,
}: {
    notes: Array<{uid: string; name: string; text: string}>
}) {
    if (notes.length === 0) return null
    const loop = notes.length === 1 ? notes : [...notes, ...notes]
    return (
        <section className="note-ticker rounded-3xl border border-gold/40 px-5 py-4">
            <div className={notes.length > 1 ? 'note-ticker-track' : undefined}>
                {loop.map((note, index) => (
                    <p key={`${note.uid}-${index}`} className="py-2 text-lg text-cream">
                        <span className="text-gold">{note.name}</span>
                        <span className="text-cream/80"> — {note.text}</span>
                    </p>
                ))}
            </div>
        </section>
    )
}
