import {type FormEvent, useEffect, useRef, useState} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {ConcludePicker} from '../components/ConcludePicker'
import {CurrentBookCard} from '../components/CurrentBookCard'
import {FirstBookSetup} from '../components/FirstBookSetup'
import {GenreVotes} from '../components/GenreVotes'
import {Accordion, AccentRule, Brand, Button, buttonClass, Card, CardTitle, ClubHeader, ErrorBanner, Field, NameForm, Page, TextInput} from '../components/ui'
import {friendlyFirebaseError} from '../lib/errors'
import {meetingRecsFromRound} from '../lib/recs'
import {
    addNomination,
    addRule,
    isOwner,
    migrateRoundNominationsToShortlist,
    pickNextBook,
    removeFromShortlist,
    resolveCurrentBook,
    seedGenreVotesFromPreviousRound,
    setGenreVotes,
    setStartingBook,
    startPresenting,
} from '../lib/store'
import {availableShortlist, clubBookStatus, clubBookStatusLabel} from '../lib/bookStatus'
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
        seedGenreVotesFromPreviousRound(code, state.round.id).catch(() => undefined)
        migrateRoundNominationsToShortlist(code, state.round.id).catch(() => undefined)
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
                <header className="flex flex-col gap-3">
                    <div>
                        <Brand/>
                        <h1 className="font-display text-3xl">Join this club</h1>
                    </div>
                    <AccentRule/>
                </header>
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
                <p>Loading club…</p>
                <ErrorBanner message={error}/>
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
                <ClubHeader
                    name={state.club.name}
                    action={
                        <Button type="button" variant="ghost" className="whitespace-nowrap" onClick={copyInvite}>
                            {copied ? 'Copied' : 'Copy link'}
                        </Button>
                    }
                />
                <ErrorBanner message={error}/>
                {owner ? (
                    <FirstBookSetup
                        statusFor={(book) => clubBookStatusLabel(clubBookStatus(state, book))}
                        onPick={(book) =>
                            setStartingBook(code, state, uid, book).catch((err) =>
                                setError(friendlyFirebaseError(err)),
                            )
                        }
                    />
                ) : (
                    <Card className="flex flex-col gap-3">
                        <CardTitle>Waiting on the first book</CardTitle>
                        <p className="text-sm text-ink/70">
                            The owner is choosing the starting book. This page will open once that’s set.
                        </p>
                    </Card>
                )}
            </Page>
        )
    }

    return (
        <Page>
            <ClubHeader
                name={state.club.name}
                action={
                    <>
                        <Button type="button" variant="ghost" className="whitespace-nowrap" onClick={copyInvite}>
                            {copied ? 'Copied' : 'Copy link'}
                        </Button>
                        {state.round?.status === 'presenting' ? (
                            <Link className={buttonClass('ghost')} to={`/club/${code}/present`}>
                                View presenting
                            </Link>
                        ) : null}
                    </>
                }
            />
            <ErrorBanner message={error}/>
            <ClubInformation
                members={state.members}
                rules={state.rules}
                onAdd={async (text) => {
                    try {
                        await addRule(code, text, uid, displayName)
                    } catch (err) {
                        setError(friendlyFirebaseError(err))
                    }
                }}
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

function ClubInformation({
    members,
    rules,
    onAdd,
}: {
    members: ClubState['members']
    rules: ClubState['rules']
    onAdd: (text: string) => Promise<void>
}) {
    return (
        <Accordion title="Club information">
            <Members members={members}/>
            <RulesBoard rules={rules} onAdd={onAdd}/>
        </Accordion>
    )
}

function Members({members}: {members: ClubState['members']}) {
    return (
        <div>
            <h3 className="mb-3 font-display text-xl">Members</h3>
            <ul className="flex flex-wrap gap-2">
                {members.map((member) => (
                    <li
                        key={member.id}
                        className={`rounded-full bg-cream px-3 py-1 text-sm ${
                            member.role === 'owner' ? 'ring-1 ring-gold/70' : ''
                        }`}
                    >
                        {member.displayName}
                        {member.role === 'owner' ? ' · owner' : ''}
                    </li>
                ))}
            </ul>
        </div>
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
        <div>
            <h3 className="mb-1 font-display text-xl">Club rules</h3>
            <p className="mb-3 text-sm text-ink/70">
                These are the group’s culture, not something the app can verify.
            </p>
            <ul className="mb-4 flex flex-col gap-2">
                {rules.length === 0 ? (
                    <li className="text-sm text-ink/60">No rules yet. Add the ones that matter to you.</li>
                ) : (
                    rules.map((rule) => (
                        <li key={rule.id} className="rounded-xl border-l-2 border-gold bg-cream px-3 py-2">
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
                <div className="flex justify-end">
                    <Button type="submit" variant="ghost">
                        Add rule
                    </Button>
                </div>
            </form>
        </div>
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

    if (round.status === 'presenting') {
        return (
            <Card className="flex flex-col gap-5">
                <CardTitle>Meeting in progress</CardTitle>
                <p className="text-sm text-ink/70">
                    Recs are frozen for this meeting. Open presenting to discuss the current book and options.
                </p>
            </Card>
        )
    }

    if (round.status === 'concluding') {
        return (
            <Card className="flex flex-col gap-5">
                <CardTitle>Picking the next book</CardTitle>
                {owner ? (
                    <ConcludePicker
                        state={state}
                        recs={recs}
                        onAddRec={(rec) =>
                            addNomination(code, uid, displayName, recToCurrentBook(rec), state).catch(onError)
                        }
                        onPick={(book) => pickNextBook(code, state, uid, book).catch(onError)}
                        onRemove={(id) => removeFromShortlist(code, id).catch(onError)}
                    />
                ) : (
                    <p className="text-sm text-ink/70">The owner is choosing the next book.</p>
                )}
            </Card>
        )
    }

    return (
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
            <div className="flex flex-col gap-3">
                <Link className={buttonClass('ghost')} to={`/club/${code}/shortlist`}>
                    Shortlist ({availableShortlist(state).length})
                </Link>
                {owner ? (
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
            </div>
        </>
    )
}
