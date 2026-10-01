import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Cover } from '../components/ui'
import { formatBookFacts } from '../lib/bookMeta'
import { availableShortlist, groupRating, pastHistoryBooks } from '../lib/bookStatus'
import { friendlyFirebaseError } from '../lib/errors'
import {
  meetingGridClass,
  meetingMode,
  meetingRootClass,
  meetingSideClass,
  meetingVoiceClass,
  recCoverClass,
  recsFill,
} from '../lib/meetingStage'
import { meetingRecsFromRound } from '../lib/recs'
import { currentHistoryBook, isOwner, resolveCurrentBook, startConcluding } from '../lib/store'
import { topWantedGenre } from '../lib/suggestion'
import { useBookFacts } from '../lib/useBookFacts'
import { useClub } from '../lib/useClub'
import type {
  AppRecommendation,
  ClubState,
  CurrentBook,
  HistoryBook,
  Member,
  Nomination,
  Rule,
} from '../types'

type CommentLine = {
  id: string
  name: string
  text: string
}

type RatingLine = {
  id: string
  name: string
  stars: number
}

type RecSlide = {
  id: string
  label: string
  rec: AppRecommendation
}

type Voice = {
  comments: CommentLine[]
  ratings: RatingLine[]
}

type LastMeeting = {
  title: string
  average: string | null
}

function presentActionClass(): string {
  return 'inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-gold/60 bg-transparent px-3 py-2 text-sm font-semibold text-gold transition duration-150 hover:bg-gold hover:text-ink hover:shadow-md active:scale-[0.98]'
}

function clubVoice(state: ClubState): Voice {
  const history = currentHistoryBook(state)
  const notes = history?.notes ?? {}
  const scores = history?.ratings ?? {}
  const comments: CommentLine[] = []
  const ratings: RatingLine[] = []
  for (const member of state.members) {
    const comment = (notes[member.id] ?? '').trim()
    if (comment) comments.push({ id: member.id, name: member.displayName, text: comment })
    const stars = scores[member.id]
    if (stars != null) ratings.push({ id: member.id, name: member.displayName, stars })
  }
  ratings.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name))
  return { comments, ratings }
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

function lastMeeting(history: HistoryBook[]): LastMeeting | null {
  const last = history.reduce<HistoryBook | null>((best, row) => {
    if (!best || row.finishedAt > best.finishedAt) return row
    return best
  }, null)
  if (!last) return null
  const group = groupRating(last.ratings)
  return { title: last.title, average: group ? group.average.toFixed(1) : null }
}

function roomLine(members: Member[]): string {
  const names = members.map((member) => member.displayName).filter(Boolean)
  if (names.length === 0) return 'Just this club'
  if (names.length <= 4) return names.join(', ')
  const extra = names.length - 3
  return `${names.slice(0, 3).join(', ')}, and ${extra} more`
}

const STAGE_QUERY = '(min-width: 1024px)'

function useStageLayout(): boolean {
  const [stage, setStage] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(STAGE_QUERY).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(STAGE_QUERY)
    const apply = () => setStage(media.matches)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
  return stage
}

export function Present() {
  const { code, uid, displayName, state, error, setError } = useClub()
  const navigate = useNavigate()
  const stage = useStageLayout()
  const current = state ? resolveCurrentBook(state) : null
  const owner = state && uid ? isOwner(state, uid) : false
  const facts = useBookFacts(current)
  const voice = useMemo(() => (state ? clubVoice(state) : { comments: [], ratings: [] }), [state])
  const recs = useMemo(() => (state ? recSlidesFromState(state) : []), [state])

  if (!uid || !displayName || !state) return null
  if (!current) return <Navigate to={`/club/${code}`} replace />

  const shortlist = availableShortlist(state)
  const past = pastHistoryBooks(state)
  const lean = topWantedGenre(state.genreVotes)
  const previous = lastMeeting(past)
  const roomScore = groupRating(Object.fromEntries(voice.ratings.map((row) => [row.id, row.stars])))
  const ratedIds = new Set(voice.ratings.map((row) => row.id))
  const waiting = state.members.filter((member) => !ratedIds.has(member.id))
  const mode = meetingMode(stage, {
    comments: voice.comments.length,
    ratings: voice.ratings.length,
    recs: recs.length,
  })
  const showVoice = voice.comments.length > 0 || voice.ratings.length > 0
  const showSide = showVoice || recs.length > 0
  const readers = state.members.length === 1 ? '1 reader' : `${state.members.length} readers`
  const together =
    past.length === 0
      ? null
      : past.length === 1
        ? '1 book together'
        : `${past.length} books together`
  const want = lean ? `${lean.count} of ${lean.voterCount} want ${lean.genre}` : null
  const meta = [readers, want, together].filter(Boolean).join(' · ')
  const room = roomLine(state.members)

  return (
    <div className={meetingRootClass(mode)}>
      <header className="flex shrink-0 flex-col gap-3 border-b border-gold/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl sm:text-2xl">{state.club.name}</h1>
          <p className="truncate text-sm text-cream/70" title={meta}>
            {meta}
          </p>
          <p className="truncate text-sm text-cream/50" title={room}>
            In the room · {room}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
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
        <p
          role="alert"
          className="mx-4 mt-3 shrink-0 rounded-xl border border-gold/40 bg-burgundy px-3 py-2 text-sm text-cream sm:mx-6"
        >
          {error}
        </p>
      ) : null}

      <div className={meetingGridClass(mode, shortlist.length > 0)}>
        <NowReading
          current={current}
          facts={facts}
          average={roomScore?.average ?? null}
          ratedCount={roomScore?.count ?? 0}
          memberCount={state.members.length}
          waiting={waiting.map((member) => member.displayName)}
          rules={state.rules}
          previous={previous}
          quiet={voice.comments.length === 0 && voice.ratings.length === 0}
        />
        {showSide ? (
          <div className={meetingSideClass(mode)}>
            {showVoice ? (
              <div className={meetingVoiceClass(mode)}>
                {voice.comments.length > 0 ? <CommentsPanel comments={voice.comments} /> : null}
                {voice.ratings.length > 0 ? <RatingsPanel ratings={voice.ratings} /> : null}
              </div>
            ) : null}
            {recs.length > 0 ? (
              <RecommendationsPanel recs={recs} fill={recsFill(mode)} cover={recCoverClass(mode)} />
            ) : null}
          </div>
        ) : null}
        <ShortlistCarousel books={shortlist} members={state.members} />
      </div>
    </div>
  )
}

function NowReading({
  current,
  facts,
  average,
  ratedCount,
  memberCount,
  waiting,
  rules,
  previous,
  quiet,
}: {
  current: CurrentBook
  facts: string
  average: number | null
  ratedCount: number
  memberCount: number
  waiting: string[]
  rules: Rule[]
  previous: LastMeeting | null
  quiet: boolean
}) {
  const everyone = ratedCount > 0 && ratedCount === memberCount
  return (
    <section className="meeting-book flex min-h-0 flex-col rounded-3xl bg-burgundy shadow-lg ring-1 ring-gold/30">
      <div className="meeting-book-body min-h-0 flex-1">
        <div className="flex min-h-full flex-col justify-center p-5 sm:p-7">
          <p className="shrink-0 text-[11px] uppercase tracking-[0.22em] text-gold">Now reading</p>
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
            <Cover
              src={current.coverUrl}
              title={current.title}
              loading="eager"
              className="h-52 w-36 shadow-lg ring-1 ring-gold/50 sm:h-64 sm:w-44 lg:h-72 lg:w-48"
            />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="font-display text-3xl leading-[1.05] sm:text-4xl lg:text-5xl">
                {current.title}
              </h2>
              <p className="mt-3 text-lg text-cream/80">{current.author}</p>
              {facts ? <p className="mt-2 text-sm text-cream/60">{facts}</p> : null}
              {average != null ? (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <Stars value={average} large />
                  <p className="text-sm font-semibold text-gold">
                    {average.toFixed(1)} · {ratedCount} of {memberCount} rated
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-sm text-cream/60">No ratings yet</p>
              )}
              {everyone ? (
                <p className="mt-2 text-sm text-gold">Everyone has rated</p>
              ) : waiting.length > 0 && ratedCount > 0 ? (
                <p className="mt-2 text-sm text-cream/60">Still to rate: {waiting.join(', ')}</p>
              ) : null}
              {quiet ? <p className="mt-2 text-sm text-cream/60">No comments yet</p> : null}
            </div>
          </div>
        </div>
      </div>
      {rules.length > 0 || previous ? (
        <footer className="shrink-0 space-y-2 border-t border-gold/25 px-5 py-3 sm:px-7">
          {previous ? (
            <p className="text-sm text-cream/75">
              <span className="font-semibold text-gold">Last time · </span>
              {previous.title}
              {previous.average ? ` · ${previous.average}` : ''}
            </p>
          ) : null}
          {rules.length > 0 ? (
            <ul className="meeting-rules space-y-1">
              {rules.map((rule) => (
                <li key={rule.id} className="text-sm text-cream/80">
                  <span className="font-semibold text-gold">House rule · </span>
                  {rule.text}
                  {rule.createdByName ? (
                    <span className="text-cream/50"> · {rule.createdByName}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </footer>
      ) : null}
    </section>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="meeting-panel flex min-w-0 flex-col rounded-3xl border border-gold/35 bg-burgundy/30 p-4 ring-1 ring-gold/10">
      <p className="shrink-0 text-[11px] uppercase tracking-[0.22em] text-gold">{title}</p>
      <div className="meeting-panel-body mt-3 flex flex-col gap-3">{children}</div>
    </section>
  )
}

function CommentsPanel({ comments }: { comments: CommentLine[] }) {
  const title = comments.length === 1 ? 'Comments · 1' : `Comments · ${comments.length}`
  return (
    <Panel title={title}>
      {comments.map((line) => (
        <blockquote key={line.id} className="border-l-2 border-gold/50 pl-3">
          <p className="text-sm leading-snug text-cream">“{line.text}”</p>
          <p className="mt-1 text-xs font-semibold text-gold">{line.name}</p>
        </blockquote>
      ))}
    </Panel>
  )
}

function RatingsPanel({ ratings }: { ratings: RatingLine[] }) {
  const title = ratings.length === 1 ? 'Ratings · 1' : `Ratings · ${ratings.length}`
  return (
    <Panel title={title}>
      {ratings.map((line) => (
        <div key={line.id} className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm">{line.name}</p>
          <span className="flex items-center gap-2">
            <Stars value={line.stars} />
            <span className="w-4 text-right text-sm font-semibold text-gold tabular-nums">
              {line.stars}
            </span>
          </span>
        </div>
      ))}
    </Panel>
  )
}

function RecommendationsPanel({
  recs,
  fill,
  cover,
}: {
  recs: RecSlide[]
  fill: boolean
  cover: string
}) {
  return (
    <Panel title="For next time">
      {recs.map((slide) => {
        const facts = formatBookFacts(slide.rec)
        return (
          <article
            key={slide.id}
            className={`flex min-h-0 gap-3 border-t border-gold/20 pt-3 first:border-t-0 first:pt-0 ${
              fill ? 'flex-1' : ''
            }`}
          >
            <Cover src={slide.rec.coverUrl} title={slide.rec.title} className={cover} />
            <div className="min-w-0">
              <p className="text-xs text-cream/60">{slide.label}</p>
              <h3 className="mt-1 font-display text-lg leading-tight break-words">
                {slide.rec.title}
              </h3>
              <p className="mt-1 text-sm text-cream/80">{slide.rec.author}</p>
              {facts ? <p className="mt-1 text-xs text-cream/60">{facts}</p> : null}
              <p className="mt-2 text-sm leading-snug text-cream/85">{slide.rec.why}</p>
            </div>
          </article>
        )
      })}
    </Panel>
  )
}

function alreadyReadNote(
  book: Nomination,
  members: Member[],
): { label: string; title: string } | null {
  if (book.alreadyReadBy.length === 0) return null
  const names = book.alreadyReadBy
    .map((id) => members.find((member) => member.id === id)?.displayName)
    .filter((name): name is string => Boolean(name))
  const count = book.alreadyReadBy.length
  const title =
    names.length > 0
      ? `${names.join(', ')} already read this`
      : `${count} ${count === 1 ? 'person has' : 'people have'} already read this`
  const label = names.length === 1 ? `${names[0]} read it` : `${count} already read`
  return { label, title }
}

function ShortlistCarousel({ books, members }: { books: Nomination[]; members: Member[] }) {
  const [paused, setPaused] = useState(false)
  if (books.length === 0) return null
  const loop = books.length > 1 ? [...books, ...books] : books
  return (
    <section
      className="shortlist-ticker col-span-full shrink-0 rounded-3xl border border-gold/35 bg-burgundy/20 py-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p className="mb-2 px-4 text-[11px] uppercase tracking-[0.2em] text-gold">
        Shortlist · {books.length}
      </p>
      <div
        className={
          books.length > 1
            ? `shortlist-ticker-track ${paused ? 'is-paused' : ''}`
            : 'flex justify-center gap-4 px-4'
        }
      >
        {loop.map((book, index) => {
          const read = alreadyReadNote(book, members)
          return (
            <div
              key={`${book.id}-${index}`}
              className="flex w-24 shrink-0 flex-col items-center gap-1 px-2"
              title={read?.title ?? `Nominated by ${book.nominatedByName}`}
            >
              <Cover src={book.coverUrl} title={book.title} className="h-20 w-14" />
              <p className="line-clamp-1 text-center font-display text-xs leading-tight">
                {book.title}
              </p>
              <p className="line-clamp-1 text-center text-[10px] leading-tight text-cream/60">
                {read?.label ?? book.nominatedByName}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Stars({ value, large = false }: { value: number; large?: boolean }) {
  const filled = Math.round(value)
  const label = `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)} out of 5`
  const size = large ? 'h-5 w-5' : 'h-3.5 w-3.5'
  return (
    <span className="inline-flex shrink-0 gap-0.5 text-gold" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} viewBox="0 0 20 20" aria-hidden="true" className={size}>
          <path
            fill={index < filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.25"
            d="M10 2.4 12.2 7l5 .6-3.7 3.4.9 5L10 13.6 5.6 16l.9-5L2.8 7.6 7.8 7 10 2.4Z"
          />
        </svg>
      ))}
    </span>
  )
}
