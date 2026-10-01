import { type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConcludePicker } from '../components/ConcludePicker'
import { CurrentBookCard } from '../components/CurrentBookCard'
import { FirstBookSetup } from '../components/FirstBookSetup'
import { GenreVotes } from '../components/GenreVotes'
import {
  Button,
  buttonClass,
  Card,
  CardTitle,
  ErrorBanner,
  Field,
  TextInput,
} from '../components/ui'
import { friendlyFirebaseError } from '../lib/errors'
import { meetingRecsFromRound } from '../lib/recs'
import {
  addNomination,
  addRule,
  isOwner,
  pickNextBook,
  removeFromShortlist,
  resolveCurrentBook,
  setGenreVotes,
  setStartingBook,
  startPresenting,
} from '../lib/store'
import { clubBookStatus, clubBookStatusLabel } from '../lib/bookStatus'
import { useClub } from '../lib/useClub'
import { type ClubState, recToCurrentBook } from '../types'

export function ClubHome() {
  const { code, uid, displayName, state, error, setError } = useClub()
  const navigate = useNavigate()

  if (!uid || !displayName || !state) return null

  const current = resolveCurrentBook(state)
  const owner = isOwner(state, uid)
  const round = state.round
  const status = round?.status
  const onError = (err: unknown) => setError(friendlyFirebaseError(err))
  const clubInfo = (
    <ClubInformation
      members={state.members}
      rules={state.rules}
      onAdd={async (text) => {
        try {
          await addRule(code, text, uid, displayName)
        } catch (err) {
          onError(err)
        }
      }}
    />
  )
  const genres =
    status === 'collecting' && round ? (
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
    ) : null

  let body = (
    <RoundStatus
      code={code}
      uid={uid}
      displayName={displayName}
      state={state}
      owner={owner}
      onError={onError}
    />
  )
  if (!current) {
    body = owner ? (
      <FirstBookSetup
        statusFor={(book) => clubBookStatusLabel(clubBookStatus(state, book))}
        onPick={(book) => setStartingBook(code, state, uid, book).catch(onError)}
      />
    ) : (
      <Card className="flex flex-col gap-3">
        <CardTitle>Waiting on the first book</CardTitle>
        <p className="text-sm text-ink/70">
          The owner is choosing the starting book. This page will open once that’s set.
        </p>
      </Card>
    )
  } else if (status === 'collecting') {
    body = (
      <>
        <CurrentBookCard code={code} uid={uid} state={state} owner={owner} onError={onError} />
        {genres}
        {owner ? (
          <Button
            type="button"
            className="self-center"
            onClick={() =>
              startPresenting(code, state, uid)
                .then(() => navigate(`/club/${code}/present`))
                .catch(onError)
            }
          >
            Present this meeting
          </Button>
        ) : null}
      </>
    )
  } else if (status === 'presenting') {
    body = (
      <>
        <CurrentBookCard code={code} uid={uid} state={state} owner={owner} onError={onError} />
        <RoundStatus
          code={code}
          uid={uid}
          displayName={displayName}
          state={state}
          owner={owner}
          onError={onError}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ErrorBanner message={error} />
      {clubInfo}
      {body}
      {!current ? genres : null}
    </div>
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
  const { code, setError } = useClub()
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | null>(null)
  const invite = `${window.location.origin}${import.meta.env.BASE_URL}club/${code}`.replace(
    /([^:]\/)\/+/g,
    '$1',
  )

  useEffect(() => {
    return () => {
      if (copiedTimer.current != null) window.clearTimeout(copiedTimer.current)
    }
  }, [])

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(invite)
      setCopied(true)
      if (copiedTimer.current != null) window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => {
        copiedTimer.current = null
        setCopied(false)
      }, 1500)
    } catch {
      setError('Could not copy the invite link.')
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <CardTitle>Club information</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => void copyInvite()}
        >
          {copied ? 'Copied' : 'Copy invite link'}
        </Button>
      </div>
      <details className="group">
        <summary className="flex list-none items-center justify-between gap-3 text-sm font-semibold outline-none select-none marker:content-none focus-visible:ring-2 focus-visible:ring-burgundy [&::-webkit-details-marker]:hidden">
          Members and rules
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-5 w-5 shrink-0 text-gold transition-transform duration-150 group-open:rotate-180"
          >
            <path
              d="M5 8l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          <Members members={members} />
          <RulesBoard rules={rules} onAdd={onAdd} />
        </div>
      </details>
    </Card>
  )
}

function Members({ members }: { members: ClubState['members'] }) {
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

function RoundStatus({
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

  if (!round) return <Card>Starting the first round…</Card>

  switch (round.status) {
    case 'presenting':
      return (
        <Card className="flex flex-col gap-4">
          <CardTitle>Meeting in progress</CardTitle>
          <p className="text-sm text-ink/70">
            Recs are frozen for this meeting. Open presenting so everyone sees the same book and
            options.
          </p>
          <Link className={buttonClass()} to={`/club/${code}/present`}>
            View presenting
          </Link>
        </Card>
      )
    case 'concluding':
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
    case 'collecting':
      return null
    default: {
      const unreachable: never = round.status
      return unreachable
    }
  }
}
