import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Brand,
  Button,
  Card,
  Cover,
  ErrorBanner,
  Field,
  NameForm,
  Page,
  TextInput,
} from '../components/ui'
import { useAuth } from '../lib/auth'
import { normalizeClubCode } from '../lib/codes'
import { friendlyFirebaseError } from '../lib/errors'
import { searchBooks, type BookSearchHit } from '../lib/openLibrary'
import { scoreNominations } from '../lib/suggestion'
import {
  addNomination,
  addRule,
  joinClub,
  lockRound,
  rateCurrentBook,
  selectBook,
  setGenreVotes,
  startNextRound,
  subscribeClub,
  toggleAlreadyRead,
} from '../lib/store'
import { GENRES, type ClubState, type Genre } from '../types'

export function ClubHome() {
  const { code: rawCode = '' } = useParams()
  const code = normalizeClubCode(rawCode)
  const { uid, displayName, ready, error, setDisplayName } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<ClubState | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
        <Brand />
        <h1 className="font-display text-3xl">Join this club</h1>
        <ErrorBanner message={error ?? localError} />
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
        <Brand />
        <p>{localError ?? 'Loading club…'}</p>
        {localError ? (
          <Button variant="ghost" onClick={() => navigate('/')}>
            Back
          </Button>
        ) : null}
      </Page>
    )
  }

  return (
    <Page>
      <header className="flex flex-col gap-2">
        <Brand />
        <h1 className="font-display text-3xl">{state.club.name}</h1>
        <p className="text-sm text-ink/70">
          Code <span className="font-mono text-lg font-semibold tracking-widest text-ink">{code}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={copyInvite}>
            {copied ? 'Copied' : 'Copy invite link'}
          </Button>
          <Link
            className="rounded-xl border border-burgundy px-4 py-3 font-semibold text-burgundy"
            to={`/club/${code}/present`}
          >
            Present this round
          </Link>
        </div>
      </header>
      <ErrorBanner message={error ?? localError} />
      <Members members={state.members} />
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
        onError={(err) => setLocalError(friendlyFirebaseError(err))}
      />
    </Page>
  )
}

function Members({ members }: { members: ClubState['members'] }) {
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
          <TextInput name="rule" placeholder="Don’t pick a book someone else already read" required />
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
  onError,
}: {
  code: string
  uid: string
  displayName: string
  state: ClubState
  onError: (err: unknown) => void
}) {
  const round = state.round
  const ranked = useMemo(
    () => scoreNominations(state.nominations, state.genreVotes, state.history),
    [state.nominations, state.genreVotes, state.history],
  )
  const selected =
    ranked.find((book) => book.id === round?.selectedNominationId) ?? ranked[0]
  const myVotes = state.genreVotes[uid] ?? []
  const myRating =
    round?.selectedNominationId &&
    state.history.find((book) => book.id === `${round.id}-${round.selectedNominationId}`)
      ?.ratings[uid]

  if (!round) return <Card>Starting the first round…</Card>

  return (
    <Card className="flex flex-col gap-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-gold">Current round</p>
        <h2 className="font-display text-2xl">
          {round.status === 'collecting' && 'Collecting picks'}
          {round.status === 'locked' && 'Ready to present'}
          {round.status === 'reading' && 'Now reading'}
          {round.status === 'done' && 'Round finished'}
        </h2>
      </div>

      {(round.status === 'collecting' || round.status === 'locked') && (
        <>
          <GenreVotes
            selected={myVotes}
            disabled={round.status !== 'collecting'}
            onSave={async (genres) => {
              try {
                await setGenreVotes(code, round.id, uid, genres)
              } catch (err) {
                onError(err)
              }
            }}
          />
          {round.status === 'collecting' ? (
            <Nominate
              existingOlids={state.nominations.map((book) => book.olid)}
              onAdd={async (hit, genre) => {
                try {
                  await addNomination(code, round.id, uid, displayName, { ...hit, genre })
                } catch (err) {
                  onError(err)
                }
              }}
            />
          ) : null}
          <Shortlist
            ranked={ranked}
            uid={uid}
            canFlag={round.status === 'collecting'}
            canPick
            onFlag={async (nominationId, already) => {
              try {
                await toggleAlreadyRead(code, round.id, nominationId, uid, already)
              } catch (err) {
                onError(err)
              }
            }}
            onPick={(nominationId) => selectBook(code, state, nominationId).catch(onError)}
          />
          {ranked[0] ? (
            <div className="rounded-xl bg-cream p-3">
              <p className="text-xs uppercase tracking-wide text-gold">Live suggestion</p>
              <p className="font-display text-xl">{ranked[0].title}</p>
              <p className="text-sm text-ink/70">{ranked[0].why}</p>
            </div>
          ) : (
            <p className="text-sm text-ink/60">Nominate a book to see a suggestion.</p>
          )}
          <div className="flex flex-col gap-2">
            {round.status === 'collecting' ? (
              <Button
                type="button"
                onClick={() => lockRound(code, state).catch(onError)}
                disabled={!ranked.length}
              >
                Lock round for presenting
              </Button>
            ) : null}
            {selected ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => selectBook(code, state, selected.id).catch(onError)}
              >
                We picked the suggestion
              </Button>
            ) : null}
          </div>
        </>
      )}

      {round.status === 'reading' && selected ? (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <Cover src={selected.coverUrl} title={selected.title} />
            <div>
              <p className="font-display text-xl">{selected.title}</p>
              <p className="text-sm text-ink/70">{selected.author}</p>
              <p className="mt-2 text-sm">{round.suggestion?.why ?? selected.why}</p>
            </div>
          </div>
          <p className="font-semibold">Your rating</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((stars) => (
              <button
                key={stars}
                type="button"
                className={`h-11 w-11 rounded-full border ${
                  myRating === stars
                    ? 'border-burgundy bg-burgundy text-cream'
                    : 'border-rule bg-cream'
                }`}
                onClick={() => rateCurrentBook(code, state, uid, stars).catch(onError)}
              >
                {stars}
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => startNextRound(code, state).catch(onError)}>
            Finish round and start next
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

function GenreVotes({
  selected,
  disabled,
  onSave,
}: {
  selected: Genre[]
  disabled: boolean
  onSave: (genres: Genre[]) => Promise<void>
}) {
  const [draft, setDraft] = useState<Genre[]>(selected)
  useEffect(() => setDraft(selected), [selected])

  return (
    <div>
      <p className="mb-2 font-semibold">Genres you want this round</p>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((genre) => {
          const on = draft.includes(genre)
          return (
            <button
              key={genre}
              type="button"
              disabled={disabled}
              className={`rounded-full px-3 py-1 text-sm ${
                on ? 'bg-burgundy text-cream' : 'bg-cream'
              }`}
              onClick={() => {
                const next = on ? draft.filter((g) => g !== genre) : [...draft, genre]
                setDraft(next)
              }}
            >
              {genre}
            </button>
          )
        })}
      </div>
      {!disabled ? (
        <Button
          type="button"
          variant="ghost"
          className="mt-3"
          onClick={() => onSave(draft)}
        >
          Save genres
        </Button>
      ) : null}
    </div>
  )
}

function Nominate({
  existingOlids,
  onAdd,
}: {
  existingOlids: string[]
  onAdd: (hit: BookSearchHit, genre: Genre) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<BookSearchHit[]>([])
  const [genre, setGenre] = useState<Genre>('Fantasy')
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
      <p className="font-semibold">Nominate a book</p>
      <form className="flex flex-col gap-2" onSubmit={runSearch}>
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or author"
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">This book’s genre</span>
          <select
            className="rounded-xl border border-rule bg-cream px-3 py-3"
            value={genre}
            onChange={(event) => setGenre(event.target.value as Genre)}
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="ghost" disabled={searching}>
          {searching ? 'Searching…' : 'Search Open Library'}
        </Button>
      </form>
      <ErrorBanner message={searchError} />
      <ul className="flex flex-col gap-2">
        {hits.map((hit) => (
          <li key={hit.olid} className="flex items-center gap-3 rounded-xl bg-cream p-2">
            <Cover src={hit.coverUrl} title={hit.title} className="h-16 w-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{hit.title}</p>
              <p className="truncate text-sm text-ink/70">{hit.author}</p>
            </div>
            <Button
              type="button"
              disabled={existingOlids.includes(hit.olid)}
              onClick={() => onAdd(hit, genre)}
            >
              {existingOlids.includes(hit.olid) ? 'Added' : 'Add'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Shortlist({
  ranked,
  uid,
  canFlag,
  canPick = false,
  onFlag,
  onPick,
}: {
  ranked: ReturnType<typeof scoreNominations>
  uid: string
  canFlag: boolean
  canPick?: boolean
  onFlag: (id: string, already: boolean) => Promise<void>
  onPick?: (id: string) => void
}) {
  if (!ranked.length) return null
  return (
    <div>
      <p className="mb-2 font-semibold">Shortlist</p>
      <ul className="flex flex-col gap-3">
        {ranked.map((book, index) => {
          const already = book.alreadyReadBy.includes(uid)
          return (
            <li key={book.id} className="flex gap-3 rounded-xl bg-cream p-2">
              <Cover src={book.coverUrl} title={book.title} className="h-20 w-14" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {index === 0 ? 'Suggested · ' : ''}
                  {book.title}
                </p>
                <p className="text-sm text-ink/70">{book.author}</p>
                <p className="text-xs text-ink/60">
                  {book.genre} · nominated by {book.nominatedByName}
                  {book.alreadyReadBy.length
                    ? ` · ${book.alreadyReadBy.length} already read`
                    : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-3">
                  {canFlag ? (
                    <button
                      type="button"
                      className="text-sm text-burgundy underline"
                      onClick={() => onFlag(book.id, already)}
                    >
                      {already ? 'I haven’t read this' : 'I’ve already read this'}
                    </button>
                  ) : null}
                  {canPick && onPick ? (
                    <button
                      type="button"
                      className="text-sm text-burgundy underline"
                      onClick={() => onPick(book.id)}
                    >
                      Pick this book
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
