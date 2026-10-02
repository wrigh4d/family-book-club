import { useState } from 'react'
import { Cover } from '../components/ui'
import type {
  CurrentBook,
  Member,
  Nomination,
  Rule,
} from '../types'
import type { LastMeeting } from './presentHelpers'

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
        <div className="flex min-h-full flex-col justify-center p-5 sm:p-7 xl:p-8 2xl:p-10">
          <p className="shrink-0 text-center text-[11px] uppercase tracking-[0.22em] text-gold sm:text-left xl:text-xs">
            Now reading
          </p>
          <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row 2xl:gap-8">
            <Cover
              src={current.coverUrl}
              title={current.title}
              loading="eager"
              className="h-52 w-36 shadow-lg ring-1 ring-gold/50 sm:h-64 sm:w-44 lg:h-72 lg:w-48 2xl:h-80 2xl:w-56"
            />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="font-display text-3xl leading-[1.05] sm:text-4xl lg:text-5xl 2xl:text-6xl">
                {current.title}
              </h2>
              <p className="mt-3 text-lg text-cream/80 2xl:text-xl">{current.author}</p>
              {facts ? <p className="mt-2 text-sm text-cream/60 2xl:text-base">{facts}</p> : null}
              {average != null ? (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <Stars value={average} large />
                  <p className="text-sm font-semibold text-gold 2xl:text-base">
                    {average.toFixed(1)} · {ratedCount} of {memberCount} rated
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-sm text-cream/60 2xl:text-base">No ratings yet</p>
              )}
              {everyone ? (
                <p className="mt-2 text-sm text-gold 2xl:text-base">Everyone has rated</p>
              ) : waiting.length > 0 && ratedCount > 0 ? (
                <p className="mt-2 text-sm text-cream/60 2xl:text-base">Still to rate: {waiting.join(', ')}</p>
              ) : null}
              {quiet ? <p className="mt-2 text-sm text-cream/60 2xl:text-base">No comments yet</p> : null}
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
