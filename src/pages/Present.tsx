import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Cover, ErrorBanner } from '../components/ui'
import { formatBookFacts } from '../lib/bookMeta'
import { friendlyFirebaseError } from '../lib/errors'
import { meetingRecsFromRound } from '../lib/recs'
import { useBookFacts } from '../lib/useBookFacts'
import { currentHistoryBook, isOwner, resolveCurrentBook, startConcluding } from '../lib/store'
import { availableShortlist } from '../lib/bookStatus'
import { useClub } from '../lib/useClub'
import type { AppRecommendation, ClubState, CurrentBook, Nomination } from '../types'

const SLIDE_MS = 9000

type ClubLine = {
  id: string
  name: string
  text: string
}

type ClubView = {
  id: 'comments' | 'ratings'
  title: string
  lines: ClubLine[]
}

type RecSlide = {
  id: string
  label: string
  rec: AppRecommendation
}

function presentActionClass(): string {
  return 'inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-gold/60 bg-transparent px-3 py-2 text-sm font-semibold text-gold transition duration-150 hover:bg-gold hover:text-ink hover:shadow-md active:scale-[0.98]'
}

function clubViews(state: ClubState): ClubView[] {
  const history = currentHistoryBook(state)
  const ratings = history?.ratings ?? {}
  const notes = history?.notes ?? {}
  const comments: ClubLine[] = []
  const scores: ClubLine[] = []
  for (const member of state.members) {
    const comment = (notes[member.id] ?? '').trim()
    if (comment) {
      comments.push({ id: member.id, name: member.displayName, text: comment })
    }
    const rating = ratings[member.id]
    if (rating != null) {
      scores.push({ id: member.id, name: member.displayName, text: `${rating}/5` })
    }
  }
  const views: ClubView[] = []
  if (comments.length) views.push({ id: 'comments', title: 'Comments', lines: comments })
  if (scores.length) views.push({ id: 'ratings', title: 'Ratings', lines: scores })
  return views
}

function recSlidesFromState(state: ClubState): RecSlide[] {
  const recs = meetingRecsFromRound(state)
  const slides: RecSlide[] = []
  if (recs.genre) {
    slides.push({
      id: `rec-genre-${recs.genre.olid}`,
      label: 'Most popular in this round’s genre',
      rec: recs.genre,
    })
  }
  if (recs.ratings) {
    slides.push({
      id: `rec-ratings-${recs.ratings.olid}`,
      label: 'From past club ratings',
      rec: recs.ratings,
    })
  }
  return slides
}

function useRotateIndex(length: number, paused: boolean): number {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (paused || length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((current) => current + 1)
    }, SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [paused, length])
  return length ? index % length : 0
}

export function Present() {
  const { code, uid, displayName, state, error, setError } = useClub()
  const navigate = useNavigate()
  const current = state ? resolveCurrentBook(state) : null
  const history = state ? currentHistoryBook(state) : null
  const owner = state && uid ? isOwner(state, uid) : false
  const facts = useBookFacts(current)
  const views = useMemo(() => (state ? clubViews(state) : []), [state])
  const recs = useMemo(() => (state ? recSlidesFromState(state) : []), [state])
  const [paused, setPaused] = useState(false)
  const hasRight = views.length > 0 || recs.length > 0

  if (!uid || !displayName || !state) return null

  if (!current) {
    return <Navigate to={`/club/${code}`} replace />
  }

  const ratings = history ? Object.values(history.ratings) : []
  const ratingLabel = ratings.length
    ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)}/5`
    : 'none yet'

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-ink text-cream"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Family Book Club</p>
          <h1 className="truncate font-display text-xl sm:text-2xl">{state.club.name}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className={presentActionClass()}
            onClick={() => navigate(`/club/${code}`)}
          >
            Back to club
          </button>
          {owner && uid ? (
            <button
              type="button"
              className={presentActionClass()}
              onClick={() =>
                startConcluding(code, state, uid)
                  .then(() => navigate(`/club/${code}`))
                  .catch((err) => setError(friendlyFirebaseError(err)))
              }
            >
              Conclude meeting
            </button>
          ) : null}
        </div>
      </header>
      {error ? (
        <div className="shrink-0 px-4 sm:px-6">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      <div
        className={`grid min-h-0 flex-1 gap-3 p-3 sm:p-4 ${
          hasRight
            ? 'grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(12rem,16rem)] lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:grid-rows-1'
            : 'grid-cols-1'
        }`}
      >
        <div className="flex h-full min-h-0 flex-col gap-3">
          <CurrentBookStage
            current={current}
            facts={facts}
            ratingLabel={history ? ratingLabel : null}
          />
          <ShortlistCarousel books={availableShortlist(state)} paused={paused} />
        </div>
        {hasRight ? (
          <div className="flex min-h-0 flex-col gap-3">
            {views.length > 0 ? <FromTheClub views={views} paused={paused} /> : null}
            {recs.length > 0 ? <RecommendationsDeck recs={recs} paused={paused} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CurrentBookStage({
  current,
  facts,
  ratingLabel,
}: {
  current: CurrentBook
  facts: string
  ratingLabel: string | null
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-burgundy p-4">
      <p className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-gold">Current book</p>
      <div className="mt-3 flex min-h-0 flex-1 items-stretch gap-4 overflow-hidden">
        <div className="aspect-[2/3] h-full w-auto max-w-[38%] shrink-0 overflow-hidden rounded-lg">
          <Cover
            src={current.coverUrl}
            title={current.title}
            className="h-full w-full"
            loading="eager"
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <h2 className="line-clamp-3 font-display text-2xl leading-tight sm:text-3xl lg:text-4xl">
            {current.title}
          </h2>
          <p className="mt-1 truncate text-cream/80">{current.author}</p>
          {facts ? <p className="mt-1 truncate text-sm text-cream/70">{facts}</p> : null}
          {ratingLabel ? <p className="mt-2 text-sm">Ratings: {ratingLabel}</p> : null}
        </div>
      </div>
    </section>
  )
}

function ShortlistCarousel({ books, paused }: { books: Nomination[]; paused: boolean }) {
  if (books.length === 0) return null
  const loop = books.length > 1 ? [...books, ...books] : books
  return (
    <section className="shortlist-ticker shrink-0 rounded-2xl border border-gold/40 py-2">
      <p className="mb-2 px-4 text-[11px] uppercase tracking-[0.2em] text-gold">Shortlist</p>
      <div
        className={
          books.length > 1
            ? `shortlist-ticker-track ${paused ? 'is-paused' : ''}`
            : 'flex justify-center gap-4 px-4'
        }
      >
        {loop.map((book, index) => (
          <div
            key={`${book.id}-${index}`}
            className="flex w-24 shrink-0 flex-col items-center gap-1 px-2"
          >
            <Cover src={book.coverUrl} title={book.title} className="h-24 w-16" />
            <p className="line-clamp-2 text-center font-display text-xs leading-tight">
              {book.title}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FromTheClub({ views, paused }: { views: ClubView[]; paused: boolean }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gold/40 bg-burgundy/25 p-4">
      <FadeDeck items={views} paused={paused}>
        {(view) => (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <p className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-gold">
              {view.title}
            </p>
            <ul className="mt-3 flex min-h-0 flex-col gap-2 overflow-hidden">
              {view.lines.map((line) => (
                <li key={line.id} className="text-base leading-snug sm:text-lg">
                  {view.id === 'comments' ? (
                    <>
                      <span className="text-cream/90">“{line.text}”</span>
                      <span className="text-cream/55"> - {line.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-gold">{line.text}</span>
                      <span className="text-cream/80"> - {line.name}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </FadeDeck>
    </section>
  )
}

function RecommendationsDeck({ recs, paused }: { recs: RecSlide[]; paused: boolean }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gold/40 bg-burgundy/25 p-4">
      <p className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-gold">Recommendations</p>
      <FadeDeck items={recs} paused={paused} className="mt-3">
        {(slide) => {
          const facts = formatBookFacts(slide.rec)
          return (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <p className="text-xs text-cream/60">{slide.label}</p>
              <div className="mt-2 flex min-h-0 flex-1 gap-3 overflow-hidden">
                <Cover
                  src={slide.rec.coverUrl}
                  title={slide.rec.title}
                  className="h-24 w-[4.25rem]"
                />
                <div className="min-w-0 overflow-hidden">
                  <h3 className="line-clamp-2 font-display text-lg leading-tight">
                    {slide.rec.title}
                  </h3>
                  <p className="mt-1 truncate text-sm text-cream/80">{slide.rec.author}</p>
                  {facts ? <p className="mt-1 truncate text-xs text-cream/70">{facts}</p> : null}
                  <p className="mt-2 line-clamp-4 text-xs text-cream/85">{slide.rec.why}</p>
                </div>
              </div>
            </div>
          )
        }}
      </FadeDeck>
    </section>
  )
}

function FadeDeck<T extends { id: string }>({
  items,
  paused,
  children,
  className = '',
}: {
  items: T[]
  paused: boolean
  children: (item: T) => ReactNode
  className?: string
}) {
  const index = useRotateIndex(items.length, paused)
  return (
    <div className={`relative min-h-0 flex-1 ${className}`}>
      {items.map((item, itemIndex) => (
        <div
          key={item.id}
          aria-hidden={itemIndex !== index}
          className={`absolute inset-0 flex flex-col overflow-hidden pb-6 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${
            itemIndex === index ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {children(item)}
        </div>
      ))}
      <StageProgress index={index} total={items.length} />
    </div>
  )
}

function StageProgress({ index, total }: { index: number; total: number }) {
  if (total <= 1) return null
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center">
      {total <= 8 ? (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }, (_, dot) => (
            <span
              key={dot}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                dot === index ? 'w-4 bg-gold' : 'w-1.5 bg-gold/35'
              }`}
            />
          ))}
        </div>
      ) : (
        <div className="h-0.5 w-24 overflow-hidden rounded-full bg-gold/20">
          <div
            className="h-full bg-gold transition-all duration-500"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
