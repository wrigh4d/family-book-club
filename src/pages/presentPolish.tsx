import type { CommentLine, MeetingProgress } from './presentHelpers'

export function MeetingBackdrop() {
  return (
    <div className="meeting-backdrop" aria-hidden="true">
      <span className="meeting-orb meeting-orb-a" />
      <span className="meeting-orb meeting-orb-b" />
      <span className="meeting-orb meeting-orb-c" />
    </div>
  )
}

export function ProgressBadge({ progress }: { progress: MeetingProgress }) {
  const circumference = 2 * Math.PI * 7.5
  const dash = circumference * progress.fraction
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-burgundy/40 px-3 py-1.5 text-xs font-semibold text-cream shadow-sm ring-1 ring-gold/15"
      title={progress.label}
      role="status"
    >
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 20 20" className="h-5 w-5 -rotate-90 text-gold">
          <circle
            cx="10"
            cy="10"
            r="7.5"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="2.5"
          />
          <circle
            cx="10"
            cy="10"
            r="7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
      </span>
      <span className="tabular-nums tracking-wide text-gold">{progress.label}</span>
    </div>
  )
}

export function FeaturedQuoteCard({ quote }: { quote: CommentLine }) {
  return (
    <aside className="meeting-quote mx-4 shrink-0 rounded-2xl border border-gold/35 bg-burgundy/35 px-4 py-3 shadow-sm ring-1 ring-gold/10 sm:mx-6 sm:px-5">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Featured quote</p>
      <blockquote className="mt-2">
        <p className="font-display text-base leading-snug text-cream sm:text-lg">
          <span className="text-gold/80" aria-hidden="true">
            {'\u201C'}
          </span>
          {quote.text}
          <span className="text-gold/80" aria-hidden="true">
            {'\u201D'}
          </span>
        </p>
        <footer className="mt-2 text-sm text-cream/65">
          <cite className="not-italic font-semibold text-gold">{quote.name}</cite>
        </footer>
      </blockquote>
    </aside>
  )
}
