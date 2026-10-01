import type { MeetingProgress } from './presentHelpers'

export function MeetingBackdrop() {
  return (
    <div className="meeting-backdrop" aria-hidden="true">
      <span className="meeting-orb meeting-orb-a" />
      <span className="meeting-orb meeting-orb-b" />
      <span className="meeting-orb meeting-orb-c" />
    </div>
  )
}

/** Progress chip for the main Present body (not the header). */
export function ProgressBadge({ progress }: { progress: MeetingProgress }) {
  const circumference = 2 * Math.PI * 7.5
  const dash = circumference * progress.fraction
  return (
    <div className="meeting-progress-inline" title={progress.label} role="status">
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
      <span className="label">{progress.label}</span>
    </div>
  )
}
