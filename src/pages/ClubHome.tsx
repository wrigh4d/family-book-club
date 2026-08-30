import {type FormEvent, useEffect, useRef, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {
    Brand,
    Button,
    buttonClass,
    Card,
    Chip,
    Cover,
    ErrorBanner,
    Field,
    NameForm,
    Page,
    TextArea,
    TextInput,
} from '../components/ui'
import {useAuth} from '../lib/auth'
import {normalizeClubCode} from '../lib/codes'
import {friendlyFirebaseError} from '../lib/errors'
import {type BookSearchHit, popularBooksOverall, searchBooks} from '../lib/openLibrary'
import {useAppRecommendations} from '../lib/useAppRecommendation'
import {
    addNomination,
    addRule,
    isOwner,
    joinClub,
    migrateRoundNominationsToShortlist,
    pickNextBook,
    rateCurrentBook,
    resolveCurrentBook,
    savePersonalNote,
    seedGenreVotesFromPreviousRound,
    setGenreVotes,
    setStartingBook,
    startPresenting,
    subscribeClub,
    wrapUpStatus,
} from '../lib/store'
import {type AppRecommendation, type ClubState, type CurrentBook, type Genre, GENRES,} from '../types'

export function ClubHome() {
    const {code: rawCode = ''} = useParams()
    const code = normalizeClubCode(rawCode)
    const {uid, displayName, ready, error, setDisplayName} = useAuth()
    const navigate = useNavigate()
    const [state, setState] = useState<ClubState | null>(null)
    const [localError, setLocalError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const seededRoundId = useRef<string | null>(null)

    useEffect(() => {
        if (!ready || !uid || !displayName || !code) return
        let stop: (() => void) | undefined
        let cancelled = false
        joinClub(code, uid, displayName)
            .then(() => {
                if (cancelled) return
                stop = subscribeClub(code, setState, (err) =>
                    setLocalError(friendlyFirebaseError(err)),
                )
            })
            .catch((err) => setLocalError(friendlyFirebaseError(err)))
        return () => {
            cancelled = true
            stop?.()
        }
    }, [ready, uid, displayName, code])

    useEffect(() => {
        if (!state?.round || state.round.status !== 'collecting') return
        if (seededRoundId.current === state.round.id) return
        seededRoundId.current = state.round.id
        seedGenreVotesFromPreviousRound(code, state.round.id).catch((err) =>
            setLocalError(friendlyFirebaseError(err)),
        )
        migrateRoundNominationsToShortlist(code, state.round.id).catch((err) =>
            setLocalError(friendlyFirebaseError(err)),
        )
    }, [code, state?.round?.id, state?.round?.status])

    const invite = `${window.location.origin}${import.meta.env.BASE_URL}club/${code}`.replace(
        /([^:]\/)\/+/g,
        '$1',
    )

    async function copyInvite() {
        await navigator.clipboard.writeText(invite)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
    }

    if (!ready) {
        return (
            <Page>
                <p>Getting you in…</p>
            </Page>
        )
    }

    if (!displayName) {
        return (
            <Page>
                <Brand/>
                <h1 className="font-display text-3xl">Join this club</h1>
                <ErrorBanner message={error ?? localError}/>
                <Card>
                    <NameForm
                        busyLabel="Join club"
                        onSave={async (name) => {
                            await setDisplayName(name)
                        }}
                    />
                </Card>
            </Page>
        )
    }

    if (!state) {
        return (
            <Page>
                <Brand/>
                <p>{localError ?? 'Loading club…'}</p>
                {localError ? (
                    <Button variant="ghost" onClick={() => navigate('/')}>
                        Back
                    </Button>
                ) : null}
            </Page>
        )
    }

    const current = resolveCurrentBook(state)
    const owner = isOwner(state, uid!)

    if (!current) {
        return (
            <Page>
                <header className="flex flex-col gap-2">
                    <Brand/>
                    <h1 className="font-display text-3xl">{state.club.name}</h1>
                </header>
                <ErrorBanner message={error ?? localError}/>
                {owner ? (
                    <FirstBookSetup
                        onPick={(book) =>
                            setStartingBook(code, state, uid!, book).catch((err) =>
                                setLocalError(friendlyFirebaseError(err)),
                            )
                        }
                    />
                ) : (
                    <Card>
                        <p className="font-display text-2xl">Waiting on the first book</p>
                        <p className="mt-2 text-sm text-ink/70">
                            The owner is choosing the starting book. This page will open once that’s set.
                        </p>
                    </Card>
                )}
            </Page>
        )
    }

    return (
        <Page>
            <header className="flex flex-col gap-2">
                <Brand/>
                <h1 className="font-display text-3xl">{state.club.name}</h1>
                <p className="text-sm text-ink/70">
                    Code <span className="font-mono text-lg font-semibold tracking-widest text-ink">{code}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" onClick={copyInvite}>
                        {copied ? 'Copied' : 'Copy invite link'}
                    </Button>
                    {state.round?.status === 'presenting' ? (
                        <Link className={buttonClass('ghost')} to={`/club/${code}/present`}>
                            View presenting
                        </Link>
                    ) : null}
                </div>
            </header>
            <ErrorBanner message={error ?? localError}/>
            <Members members={state.members}/>
            <RulesBoard
                state={state}
                onAdd={async (text) => {
                    if (!uid || !displayName) return
                    try {
                        await addRule(code, text, uid, displayName)
                    } catch (err) {
                        setLocalError(friendlyFirebaseError(err))
                    }
                }}
            />
            <RoundPanel
                code={code}
                uid={uid!}
                displayName={displayName}
                state={state}
                owner={owner}
                onError={(err) => setLocalError(friendlyFirebaseError(err))}
            />
        </Page>
    )
}

function Members({members}: { members: ClubState['members'] }) {
    return (
        <Card>
            <h2 className="mb-3 font-display text-2xl">Members</h2>
            <ul className="flex flex-wrap gap-2">
                {members.map((member) => (
                    <li
                        key={member.id}
                        className="rounded-full bg-cream px-3 py-1 text-sm"
                    >
                        {member.displayName}
                        {member.role === 'owner' ? ' · owner' : ''}
                    </li>
                ))}
            </ul>
        </Card>
    )
}

function RulesBoard({
                        state,
                        onAdd,
                    }: {
    state: ClubState
    onAdd: (text: string) => Promise<void>
}) {
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = event.currentTarget
        const text = String(new FormData(form).get('rule') ?? '')
        await onAdd(text)
        form.reset()
    }

    return (
        <Card>
            <h2 className="mb-1 font-display text-2xl">Club rules</h2>
            <p className="mb-3 text-sm text-ink/70">
                These are the group’s culture, not something the app can verify.
            </p>
            <ul className="mb-4 flex flex-col gap-2">
                {state.rules.length === 0 ? (
                    <li className="text-sm text-ink/60">No rules yet. Add the ones that matter to you.</li>
                ) : (
                    state.rules.map((rule) => (
                        <li key={rule.id} className="rounded-xl bg-cream px-3 py-2">
                            <p>{rule.text}</p>
                            <p className="text-xs text-ink/60">{rule.createdByName}</p>
                        </li>
                    ))
                )}
            </ul>
            <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
                <Field label="Add a rule">
                    <TextInput name="rule" placeholder="Don’t pick a book someone else already read" required/>
                </Field>
                <Button type="submit" variant="ghost">
                    Add rule
                </Button>
            </form>
        </Card>
    )
}

function RoundPanel({
                        code,
                        uid,
                        displayName,
                        state,
                        owner,
                        onError,
                    }: {
    code: string
    uid: string
    displayName: string
    state: ClubState
    owner: boolean
    onError: (err: unknown) => void
}) {
    const round = state.round
    const recs = useAppRecommendations(state)
    const wrap = wrapUpStatus(state)
    const current = resolveCurrentBook(state)
    const myRating = wrap.book?.ratings[uid]
    const navigate = useNavigate()

    function recAsBook(rec: AppRecommendation) {
        const match = GENRES.find((g) => g.toLowerCase() === rec.genre.toLowerCase())
        return {
            olid: rec.olid,
            title: rec.title,
            author: rec.author,
            coverUrl: rec.coverUrl,
            genre: match ?? 'Literary',
        }
    }

    if (!round) return <Card>Starting the first round…</Card>

    return (
        <Card className="flex flex-col gap-5">
            <div>
                <p className="text-xs uppercase tracking-wide text-gold">Current round</p>
                <h2 className="font-display text-2xl">
                    {round.status === 'collecting' && 'Between meetings'}
                    {round.status === 'presenting' && 'Meeting in progress'}
                    {round.status === 'concluding' && 'Picking the next book'}
                </h2>
            </div>

            {round.status === 'presenting' ? (
                <p className="text-sm text-ink/70">
                    Recs are frozen for this meeting. Open presenting to discuss the current book and options.
                </p>
            ) : null}

            {round.status === 'concluding' ? (
                owner ? (
                    <ConcludePicker
                        shortlist={state.nominations}
                        recs={recs}
                        onAddRec={(rec) => addNomination(code, uid, displayName, recAsBook(rec)).catch(onError)}
                        onPick={(book) => pickNextBook(code, state, uid, book).catch(onError)}
                    />
                ) : (
                    <p className="text-sm text-ink/70">The owner is choosing the next book.</p>
                )
            ) : null}

            {round.status === 'collecting' ? (
                <>
                    <CurrentBookCard
                        code={code}
                        uid={uid}
                        state={state}
                        current={current}
                        myRating={typeof myRating === 'number' ? myRating : undefined}
                        wrap={wrap}
                        onError={onError}
                    />
                    <GenreVotes
                        uid={uid}
                        members={state.members}
                        votes={state.genreVotes}
                        disabled={false}
                        onSave={async (genres) => {
                            try {
                                await setGenreVotes(code, round.id, uid, genres)
                            } catch (err) {
                                onError(err)
                            }
                        }}
                    />
                    <Link className={buttonClass('ghost')} to={`/club/${code}/shortlist`}>
                        Shortlist ({state.nominations.length})
                    </Link>
                </>
            ) : null}

            {owner && round.status === 'collecting' ? (
                <Button
                    type="button"
                    onClick={() =>
                        startPresenting(code, state, uid)
                            .then(() => navigate(`/club/${code}/present`))
                            .catch(onError)
                    }
                >
                    Present this meeting
                </Button>
            ) : null}
        </Card>
    )
}

function GenreVotes({
                        uid,
                        members,
                        votes,
                        disabled,
                        onSave,
                    }: {
    uid: string
    members: ClubState['members']
    votes: Record<string, Genre[]>
    disabled: boolean
    onSave: (genres: Genre[]) => Promise<void>
}) {
    const live = votes[uid] ?? []
    const liveKey = live.join('|')
    const [mine, setMine] = useState<Genre[]>(live)
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    useEffect(() => {
        setMine(liveKey ? (liveKey.split('|') as Genre[]) : [])
    }, [liveKey])

    async function toggle(genre: Genre) {
        const next = mine.includes(genre) ? mine.filter((g) => g !== genre) : [...mine, genre]
        setMine(next)
        setStatus('saving')
        try {
            await onSave(next)
            setStatus('saved')
        } catch {
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
                            selected={mine.includes(genre)}
                            disabled={disabled}
                            onClick={() => toggle(genre)}
                        >
                            {genre}
                        </Chip>
                    ))}
                </div>
                {!disabled ? (
                    <p className="mt-2 text-xs text-ink/60">
                        {status === 'saving' && 'Saving…'}
                        {status === 'saved' && 'Saved. Other members can see this now.'}
                        {status === 'idle' && mine.length > 0 && 'Carried over from last round. No need to tap unless you want to change.'}
                        {status === 'idle' && mine.length === 0 && 'No genres selected yet.'}
                    </p>
                ) : (
                    <p className="mt-2 text-xs text-ink/60">This round is locked, so votes cannot change.</p>
                )}
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


function CurrentBookCard({
                             code,
                             uid,
                             state,
                             current,
                             myRating,
                             wrap,
                             onError,
                         }: {
    code: string
    uid: string
    state: ClubState
    current: CurrentBook | null
    myRating?: number
    wrap: ReturnType<typeof wrapUpStatus>
    onError: (err: unknown) => void
}) {
    const [note, setNote] = useState(wrap.book?.notes?.[uid] ?? '')
    useEffect(() => {
        setNote(wrap.book?.notes?.[uid] ?? '')
    }, [wrap.book?.notes, uid])

    if (!current) {
        return (
            <div className="rounded-xl bg-cream p-3">
                <p className="text-xs uppercase tracking-wide text-gold">Current book</p>
                <p className="mt-1 text-sm text-ink/70">None yet. The owner will pick one after presenting.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-3">
                <Cover src={current.coverUrl} title={current.title}/>
                <div>
                    <p className="text-xs uppercase tracking-wide text-gold">Current book</p>
                    <p className="font-display text-xl">{current.title}</p>
                    <p className="text-sm text-ink/70">{current.author}</p>
                </div>
            </div>
            <div>
                <p className="mb-2 text-sm font-semibold">Your rating</p>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                            key={stars}
                            type="button"
                            className={`h-11 w-11 rounded-full border transition duration-150 ${
                                myRating === stars
                                    ? 'border-burgundy bg-burgundy text-cream hover:bg-[#5c211b]'
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
                <p className="mb-2 text-sm font-semibold">Your note</p>
                <TextArea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="A thought for the meeting — optional"
                />
                <Button
                    type="button"
                    variant="ghost"
                    className="mt-2"
                    onClick={() => savePersonalNote(code, state, uid, note).catch(onError)}
                >
                    Save note
                </Button>
            </div>
        </div>
    )
}

function FirstBookSetup({onPick}: { onPick: (book: CurrentBook) => void }) {
    const [query, setQuery] = useState('')
    const [hits, setHits] = useState<BookSearchHit[]>([])
    const [popular, setPopular] = useState<BookSearchHit[]>([])
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        popularBooksOverall()
            .then((books) => {
                if (!cancelled) setPopular(books)
            })
            .catch((err) => {
                if (!cancelled) setSearchError(friendlyFirebaseError(err))
            })
        return () => {
            cancelled = true
        }
    }, [])

    async function runSearch(event: FormEvent) {
        event.preventDefault()
        setSearching(true)
        setSearchError(null)
        try {
            setHits(await searchBooks(query))
        } catch (err) {
            setSearchError(friendlyFirebaseError(err))
        } finally {
            setSearching(false)
        }
    }

    function asCurrent(hit: BookSearchHit): CurrentBook {
        return {
            olid: hit.olid,
            title: hit.title,
            author: hit.author,
            coverUrl: hit.coverUrl,
            genre: hit.genre,
        }
    }

    return (
        <Card className="flex flex-col gap-5">
            <div>
                <p className="text-xs uppercase tracking-wide text-gold">First book</p>
                <h2 className="font-display text-2xl">Choose the starting book</h2>
                <p className="mt-1 text-sm text-ink/70">
                    The club page opens after you pick this. Recs below are popular overall, not based on this club.
                </p>
            </div>
            <form className="flex flex-col gap-2" onSubmit={runSearch}>
                <TextInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search title or author"
                />
                <Button type="submit" variant="ghost" disabled={searching}>
                    {searching ? 'Searching…' : 'Search Open Library'}
                </Button>
            </form>
            <ErrorBanner message={searchError}/>
            {hits.length > 0 ? (
                <BookPickList books={hits} onPick={(hit) => onPick(asCurrent(hit))}/>
            ) : null}
            <div>
                <p className="mb-2 font-semibold">Popular right now</p>
                {popular.length === 0 ? (
                    <p className="text-sm text-ink/60">Loading popular titles…</p>
                ) : (
                    <BookPickList books={popular} onPick={(hit) => onPick(asCurrent(hit))}/>
                )}
            </div>
        </Card>
    )
}

function BookPickList({
                          books,
                          onPick,
                      }: {
    books: BookSearchHit[]
    onPick: (hit: BookSearchHit) => void
}) {
    return (
        <ul className="flex flex-col gap-2">
            {books.map((hit) => (
                <li key={hit.olid}>
                    <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl bg-cream p-2 text-left transition hover:bg-burgundy/10"
                        onClick={() => onPick(hit)}
                    >
                        <Cover src={hit.coverUrl} title={hit.title} className="h-16 w-11"/>
                        <span>
              <span className="block font-semibold">{hit.title}</span>
              <span className="text-sm text-ink/70">{hit.author}</span>
            </span>
                    </button>
                </li>
            ))}
        </ul>
    )
}

function ConcludePicker({
                            shortlist,
                            recs,
                            onAddRec,
                            onPick,
                        }: {
    shortlist: ClubState['nominations']
    recs: { genre: AppRecommendation | null; ratings: AppRecommendation | null }
    onAddRec: (rec: AppRecommendation) => void
    onPick: (book: CurrentBook) => void
}) {
    return (
        <div className="flex flex-col gap-4">
            {recs.genre ? (
                <ConcludeRec
                    label="Most popular in this round’s genre"
                    rec={recs.genre}
                    onShortlist={shortlist.some((book) => book.olid === recs.genre?.olid)}
                    onAdd={() => onAddRec(recs.genre!)}
                />
            ) : null}
            {recs.ratings ? (
                <ConcludeRec
                    label="From past club ratings"
                    rec={recs.ratings}
                    onShortlist={shortlist.some((book) => book.olid === recs.ratings?.olid)}
                    onAdd={() => onAddRec(recs.ratings!)}
                />
            ) : null}
            <p className="font-semibold">Pick the next book from the shortlist</p>
            {shortlist.length === 0 ? (
                <p className="text-sm text-ink/70">Shortlist is empty. Add a rec, search below, or go back and
                    nominate.</p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {shortlist.map((book) => (
                        <li key={book.id}>
                            <button
                                type="button"
                                className="flex w-full items-center gap-3 rounded-xl bg-cream p-2 text-left transition hover:bg-burgundy/10"
                                onClick={() => onPick(book)}
                            >
                                <Cover src={book.coverUrl} title={book.title} className="h-16 w-11"/>
                                <span>
                  <span className="block font-semibold">{book.title}</span>
                  <span className="text-sm text-ink/70">{book.author}</span>
                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <ConcludeSearch onPick={onPick}/>
        </div>
    )
}

function ConcludeSearch({onPick}: { onPick: (book: CurrentBook) => void }) {
    const [query, setQuery] = useState('')
    const [hits, setHits] = useState<BookSearchHit[]>([])
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)

    async function runSearch(event: FormEvent) {
        event.preventDefault()
        setSearching(true)
        setSearchError(null)
        try {
            setHits(await searchBooks(query))
        } catch (err) {
            setSearchError(friendlyFirebaseError(err))
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="font-semibold">Or search Open Library</p>
            <form className="flex flex-col gap-2" onSubmit={runSearch}>
                <TextInput
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search title or author"
                />
                <Button type="submit" variant="ghost" disabled={searching}>
                    {searching ? 'Searching…' : 'Search'}
                </Button>
            </form>
            <ErrorBanner message={searchError}/>
            <ul className="flex flex-col gap-2">
                {hits.map((hit) => (
                    <li key={hit.olid} className="flex items-center gap-3 rounded-xl bg-cream p-2">
                        <Cover src={hit.coverUrl} title={hit.title} className="h-16 w-11"/>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{hit.title}</p>
                            <p className="truncate text-sm text-ink/70">{hit.author}</p>
                        </div>
                        <Button
                            type="button"
                            onClick={() =>
                                onPick({
                                    olid: hit.olid,
                                    title: hit.title,
                                    author: hit.author,
                                    coverUrl: hit.coverUrl,
                                    genre: hit.genre,
                                })
                            }
                        >
                            Choose
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function ConcludeRec({
                         label,
                         rec,
                         onShortlist,
                         onAdd,
                     }: {
    label: string
    rec: AppRecommendation
    onShortlist: boolean
    onAdd: () => void
}) {
    return (
        <div className="rounded-xl border border-gold/40 bg-cream p-3">
            <p className="text-xs uppercase tracking-wide text-gold">{label}</p>
            <div className="mt-2 flex gap-3">
                <Cover src={rec.coverUrl} title={rec.title} className="h-20 w-14"/>
                <div className="min-w-0 flex-1">
                    <p className="font-display text-xl">{rec.title}</p>
                    <p className="text-sm text-ink/70">{rec.author}</p>
                    <p className="mt-1 text-sm text-ink/70">{rec.why}</p>
                    <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 py-2"
                        disabled={onShortlist}
                        onClick={onAdd}
                    >
                        {onShortlist ? 'On the shortlist' : 'Add to shortlist'}
                    </Button>
                </div>
            </div>
        </div>
    )
}


