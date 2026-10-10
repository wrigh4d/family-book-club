import { useEffect, useState } from 'react'
import {
  SECONDARY_ROTATION_MS,
  nextSecondaryIndex,
  type SecondaryPanel,
} from '../lib/secondaryPanels'
import { formatCommentTime } from '../lib/comments'
import type { CommentLine, RatingLine } from './presentHelpers'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(media.matches)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
  return reduced
}

function Stars({ value }: { value: number }) {
  const filled = Math.round(value)
  return (
    <span className="inline-flex shrink-0 gap-0.5 text-gold" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <svg key={index} viewBox="0 0 20 20" className="meeting-secondary-star">
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

function CommentsSlide({ comments }: { comments: CommentLine[] }) {
  const title =
    comments.length === 1 ? 'Comments · 1' : `Comments · ${comments.length}`
  return (
    <div className="meeting-secondary-body">
      <p className="meeting-secondary-kicker">
        <span aria-hidden="true" className="meeting-secondary-accent" />
        {title}
      </p>
      <ul className="meeting-secondary-list">
        {comments.map((row) => {
          const when = formatCommentTime(row.at)
          return (
            <li key={row.id} className="meeting-secondary-item">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="meeting-secondary-name">{row.name}</p>
                {when ? (
                  <time
                    dateTime={new Date(row.at).toISOString()}
                    className="meeting-secondary-meta"
                  >
                    {when}
                  </time>
                ) : null}
              </div>
              <p className="meeting-secondary-copy whitespace-pre-wrap">{row.text}</p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RatingsSlide({ ratings }: { ratings: RatingLine[] }) {
  const title = ratings.length === 1 ? 'Ratings · 1' : `Ratings · ${ratings.length}`
  return (
    <div className="meeting-secondary-body">
      <p className="meeting-secondary-label">{title}</p>
      <ul className="meeting-secondary-list gap-meeting">
        {ratings.map((line) => (
          <li key={line.id} className="flex items-center justify-between gap-3">
            <p className="meeting-secondary-copy min-w-0 truncate">{line.name}</p>
            <span className="flex items-center gap-2">
              <Stars value={line.stars} />
              <span className="meeting-secondary-score">{line.stars}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeaturedSlide({ comment }: { comment: CommentLine }) {
  return (
    <div className="meeting-secondary-body meeting-secondary-feature">
      <p className="meeting-secondary-label">Featured comment</p>
      <blockquote className="mt-meeting">
        <p className="meeting-secondary-quote">
          <span className="text-gold/80" aria-hidden="true">
            {'\u201C'}
          </span>
          {comment.text}
          <span className="text-gold/80" aria-hidden="true">
            {'\u201D'}
          </span>
        </p>
        <footer className="meeting-secondary-cite">
          <cite className="not-italic font-semibold text-gold">{comment.name}</cite>
        </footer>
      </blockquote>
    </div>
  )
}

function renderPanel(panel: SecondaryPanel) {
  switch (panel.kind) {
    case 'comments':
      return <CommentsSlide comments={panel.comments} />
    case 'ratings':
      return <RatingsSlide ratings={panel.ratings} />
    case 'featured':
      return <FeaturedSlide comment={panel.comment} />
  }
}

function panelLabel(panel: SecondaryPanel): string {
  switch (panel.kind) {
    case 'comments':
      return 'Comments'
    case 'ratings':
      return 'Ratings'
    case 'featured':
      return 'Featured comment'
  }
}

export function SecondaryCarousel({ panels }: { panels: SecondaryPanel[] }) {
  const reducedMotion = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const safeIndex = panels.length === 0 ? 0 : index % panels.length
  const active = panels[safeIndex] ?? null

  useEffect(() => {
    if (panels.length <= 1 || paused) return
    const id = window.setInterval(() => {
      setIndex((current) => nextSecondaryIndex(current, panels.length))
    }, SECONDARY_ROTATION_MS)
    return () => window.clearInterval(id)
  }, [panels.length, paused])

  if (!active) return null

  return (
    <aside
      className="meeting-secondary"
      aria-roledescription="carousel"
      aria-label="Meeting highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      <div
        key={`${active.kind}-${safeIndex}`}
        className={
          reducedMotion ? 'meeting-secondary-slide' : 'meeting-secondary-slide is-animated'
        }
        aria-live="polite"
        aria-atomic="true"
      >
        {renderPanel(active)}
      </div>
      {panels.length > 1 ? (
        <div className="meeting-secondary-dots" role="tablist" aria-label="Highlight panels">
          {panels.map((panel, dotIndex) => {
            const selected = dotIndex === safeIndex
            return (
              <button
                key={`${panel.kind}-${dotIndex}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={panelLabel(panel)}
                className={selected ? 'meeting-secondary-dot is-active' : 'meeting-secondary-dot'}
                onClick={() => setIndex(dotIndex)}
              />
            )
          })}
        </div>
      ) : null}
    </aside>
  )
}
