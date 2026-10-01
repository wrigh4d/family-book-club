import { type ReactNode, useState } from 'react'
import { Cover } from '../components/ui'
import { formatCommentTime } from '../lib/comments'
import { formatBookFacts } from '../lib/bookMeta'
import type {
  CurrentBook,
  Member,
  Nomination,
  Rule,
} from '../types'
import type { CommentLine, LastMeeting, RatingLine, RecSlide } from './presentHelpers'

export function NowReading({
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

/** Read-only animated club comments for Present (no compose input). */
export function MeetingComments({ comments }: { comments: CommentLine[] }) {
  const title =
    comments.length === 0
      ? 'Comments'
      : comments.length === 1
        ? 'Comments · 1'
        : `Comments · ${comments.length}`
  return (
    <section className="meeting-panel flex min-w-0 flex-col rounded-3xl border border-gold/35 bg-burgundy/30 p-4 ring-1 ring-gold/10">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cream">
        <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-gold" />
        {title}
      </p>
      {comments.length === 0 ? (
        <p className="text-sm text-cream/60">No comments yet.</p>
      ) : (
        <ul className="meeting-panel-body meeting-comments mt-1 flex flex-col gap-2">
          {comments.map((row, index) => {
            const when = formatCommentTime(row.at)
            return (
              <li
                key={row.id}
                className="meeting-comment rounded-xl border border-gold/25 bg-burgundy/35 px-3.5 py-2.5"
                style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-xs font-semibold text-gold">{row.name}</p>
                  {when ? (
                    <time
                      dateTime={new Date(row.at).toISOString()}
                      className="text-[11px] tabular-nums text-cream/50"
                    >
                      {when}
                    </time>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-cream">{row.text}</p>
              </li>
            )
          })}
        </ul>
      )}
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

export function RatingsPanel({ ratings }: { ratings: RatingLine[] }) {
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

export function RecommendationsPanel({
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

export function ShortlistCarousel({ books, members }: { books: Nomination[]; members: Member[] }) {
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
