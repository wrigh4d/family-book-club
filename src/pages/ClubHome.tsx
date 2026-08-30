import {type FormEvent, useEffect, useRef, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {ConcludePicker} from '../components/ConcludePicker'
import {CurrentBookCard} from '../components/CurrentBookCard'
import {FirstBookSetup} from '../components/FirstBookSetup'
import {GenreVotes} from '../components/GenreVotes'
import {Brand, Button, buttonClass, Card, ErrorBanner, Field, NameForm, Page, TextInput} from '../components/ui'
import {friendlyFirebaseError} from '../lib/errors'
import {meetingRecsFromRound} from '../lib/recs'
import {
    addNomination,
    addRule,
    isOwner,
    migrateRoundNominationsToShortlist,
    pickNextBook,
    resolveCurrentBook,
    seedGenreVotesFromPreviousRound,
    setGenreVotes,
    setStartingBook,
    startPresenting,
} from '../lib/store'
import {useClub} from '../lib/useClub'
import {type ClubState, recToCurrentBook} from '../types'

export function ClubHome() {
    const {code: rawCode = ''} = useParams()
    const {
        code,
        uid,
        displayName,
        ready,
        state,
        error,
        setError,
        setDisplayName,
    } = useClub(rawCode)
    const navigate = useNavigate()
    const [copied, setCopied] = useState(false)
    const seededRoundId = useRef<string | null>(null)

    useEffect(() => {
        if (!state?.round || state.round.status !== 'collecting' || !uid) return
        if (!isOwner(state, uid)) return
        if (seededRoundId.current === state.round.id) return
        seededRoundId.current = state.round.id
        seedGenreVotesFromPreviousRound(code, state.round.id).catch((err) =>
            setError(friendlyFirebaseError(err)),
        )
        migrateRoundNominationsToShortlist(code, state.round.id).catch((err) =>
            setError(friendlyFirebaseError(err)),
        )
    }, [code, uid, state?.round?.id, state?.round?.status, state, setError])

    const invite = `${window.location.origin}${import.meta.env.BASE_URL}club/${code}`.replace(
        /([^:]\/)\/+/g,
        '$1',
    )

    async function copyInvite() {
        try {
            await navigator.clipboard.writeText(invite)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
        } catch {
            setError('Could not copy the invite link.')
        }
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
                <ErrorBanner message={error}/>
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

    if (!state || !uid) {
        return (
            <Page>
                <Brand/>
                <p>{error ?? 'Loading club…'}</p>
                {error ? (
                    <Button variant="ghost" onClick={() => navigate('/')}>
                        Back
                    </Button>
                ) : null}
            </Page>
        )
    }

    const current = resolveCurrentBook(state)
    const owner = isOwner(state, uid)

    if (!current) {
        return (
            <Page>
                <header className="flex flex-col gap-2">
                    <Brand/>
                    <h1 className="font-display text-3xl">{state.club.name}</h1>
                </header>
                <ErrorBanner message={error}/>
                {owner ? (
                    <FirstBookSetup
                        onPick={(book) =>
                            setStartingBook(code, state, uid, book).catch((err) =>
                                setError(friendlyFirebaseError(err)),
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
            <ErrorBanner message={error}/>
            <Members members={state.members}/>
            <RulesBoard
                onAdd={async (text) => {
                    try {
                        await addRule(code, text, uid, displayName)
                    } catch (err) {
                        setError(friendlyFirebaseError(err))
                    }
                }}
                rules={state.rules}
            />
            <RoundPanel
                code={code}
                uid={uid}
                displayName={displayName}
                state={state}
                owner={owner}
                onError={(err) => setError(friendlyFirebaseError(err))}
            />
        </Page>
    )
}

function Members({members}: {members: ClubState['members']}) {
    return (
        <Card>
            <h2 className="mb-3 font-display text-2xl">Members</h2>
            <ul className="flex flex-wrap gap-2">
                {members.map((member) => (
                    <li key={member.id} className="rounded-full bg-cream px-3 py-1 text-sm">
                        {member.displayName}
                        {member.role === 'owner' ? ' · owner' : ''}
                    </li>
                ))}
            </ul>
        </Card>
    )
}

function RulesBoard({
    rules,
    onAdd,
}: {
    rules: ClubState['rules']
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
                {rules.length === 0 ? (
                    <li className="text-sm text-ink/60">No rules yet. Add the ones that matter to you.</li>
                ) : (
                    rules.map((rule) => (
                        <li key={rule.id} className="rounded-xl bg-cream px-3 py-2">
                            <p>{rule.text}</p>
                            <p className="text-xs text-ink/60">{rule.createdByName}</p>
                        </li>
                    ))
                )}
            </ul>
            <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
                <Field label="Add a rule">
                    <TextInput
                        name="rule"
                        placeholder="Don’t pick a book someone else already read"
                        required
                        maxLength={500}
                    />
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
    const recs = meetingRecsFromRound(state)
    const navigate = useNavigate()

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
                        onAddRec={(rec) =>
                            addNomination(code, uid, displayName, recToCurrentBook(rec)).catch(onError)
                        }
                        onPick={(book) => pickNextBook(code, state, uid, book).catch(onError)}
                    />
                ) : (
                    <p className="text-sm text-ink/70">The owner is choosing the next book.</p>
                )
            ) : null}

            {round.status === 'collecting' ? (
                <>
                    <CurrentBookCard code={code} uid={uid} state={state} onError={onError}/>
                    <GenreVotes
                        uid={uid}
                        members={state.members}
                        votes={state.genreVotes}
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
