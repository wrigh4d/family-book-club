import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Cover, ErrorBanner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { normalizeClubCode } from '../lib/codes'
import { friendlyFirebaseError } from '../lib/errors'
import { joinClub, subscribeClub } from '../lib/store'
import { genreLean, scoreNominations } from '../lib/suggestion'
import type { ClubState } from '../types'

export function Present() {
  const { code: rawCode = '' } = useParams()
  const code = normalizeClubCode(rawCode)
  const { uid, displayName, ready } = useAuth()
  const [state, setState] = useState<ClubState | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready || !uid || !displayName || !code) return
    let stop: (() => void) | undefined
    joinClub(code, uid, displayName)
      .then(() => {
        stop = subscribeClub(code, setState, (err) =>
          setError(friendlyFirebaseError(err)),
        )
      })
      .catch((err) => setError(friendlyFirebaseError(err)))
    return () => stop?.()
  }, [ready, uid, displayName, code])

  const live = useMemo(
    () =>
      state
        ? scoreNominations(state.nominations, state.genreVotes, state.history)
        : [],
    [state],
  )
  const lean = state ? genreLean(state.genreVotes) : []
  const locked = state?.round?.status === 'locked' || state?.round?.status === 'reading'
  const featured = locked && state?.round?.suggestion
    ? {
        title: state.round.suggestion.title,
        author: state.round.suggestion.author,
        coverUrl: state.round.suggestion.coverUrl,
        why: state.round.suggestion.why,
      }
    : live[0]
      ? {
          title: live[0].title,
          author: live[0].author,
          coverUrl: live[0].coverUrl,
          why: live[0].why,
        }
      : null
  const rest =
    locked && state?.round?.suggestion
      ? state.round.suggestion.shortlist
      : live.slice(1)

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink px-4 text-cream">
        <p>{error ?? 'Opening presenting mode…'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ink px-4 py-6 text-cream sm:px-10 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gold">Family Book Club</p>
            <h1 className="font-display text-4xl sm:text-6xl">{state.club.name}</h1>
          </div>
          <Link className="text-sm text-gold underline" to={`/club/${code}`}>
            Back to club
          </Link>
        </header>
        <ErrorBanner message={error} />

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

        <section className="rounded-3xl bg-burgundy p-5 sm:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-gold">Suggested next book</p>
          {featured ? (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              <Cover
                src={featured.coverUrl}
                title={featured.title}
                className="h-48 w-32 sm:h-64 sm:w-44"
              />
              <div>
                <h3 className="font-display text-3xl sm:text-5xl">{featured.title}</h3>
                <p className="mt-1 text-lg text-cream/80">{featured.author}</p>
                <p className="mt-4 max-w-xl text-lg">{featured.why}</p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-lg">Nominate books on the club page to see a suggestion.</p>
          )}
        </section>

        {rest.length > 0 ? (
          <section>
            <h2 className="mb-3 font-display text-2xl text-gold">Also on the shortlist</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {rest.map((book) => (
                <li key={book.id} className="flex gap-3 rounded-2xl bg-cream/10 p-3">
                  <Cover src={book.coverUrl} title={book.title} className="h-20 w-14" />
                  <div>
                    <p className="font-display text-xl">{book.title}</p>
                    <p className="text-sm text-cream/70">{book.author}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
