export type MeetingMode =
  | { kind: 'scroll'; fill: boolean }
  | { kind: 'book' }
  | { kind: 'split' }
  | { kind: 'side'; pair: boolean }

export function meetingMode(
  stage: boolean,
  counts: { comments: number; ratings: number; recs: number },
): MeetingMode {
  const hasVoice = counts.comments > 0 || counts.ratings > 0
  const hasRecs = counts.recs > 0
  if (!stage) return { kind: 'scroll', fill: !hasVoice && hasRecs }
  if (!hasVoice && hasRecs) return { kind: 'split' }
  if (!hasVoice) return { kind: 'book' }
  return { kind: 'side', pair: counts.comments > 0 && counts.ratings > 0 }
}

export function meetingLocked(mode: MeetingMode): boolean {
  return mode.kind !== 'scroll'
}

export function recsFill(mode: MeetingMode): boolean {
  return mode.kind === 'split' || (mode.kind === 'scroll' && mode.fill)
}

const TONE = 'bg-[radial-gradient(ellipse_at_top,#3a241c_0%,#1c1612_58%)] text-cream'

export function meetingRootClass(mode: MeetingMode): string {
  const frame =
    mode.kind === 'scroll'
      ? 'flex min-h-dvh flex-col pb-[env(safe-area-inset-bottom)]'
      : 'meeting-stage flex h-dvh flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]'
  return `${frame} ${TONE}`
}

export function meetingGridClass(mode: MeetingMode, hasShortlist: boolean): string {
  if (mode.kind === 'scroll') return 'flex flex-col gap-3 p-3 sm:gap-4 sm:p-4'
  const columns =
    mode.kind === 'book'
      ? 'grid-cols-1'
      : mode.kind === 'split'
        ? 'grid-cols-2'
        : 'grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.9fr)]'
  const rows = hasShortlist ? 'grid-rows-[minmax(0,1fr)_auto]' : 'grid-rows-[minmax(0,1fr)]'
  return `grid min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:p-4 ${columns} ${rows}`
}

export function meetingSideClass(mode: MeetingMode): string {
  if (mode.kind === 'scroll') return 'flex flex-col gap-3'
  return 'flex h-full min-h-0 flex-col gap-3 overflow-hidden'
}

export function meetingVoiceClass(mode: MeetingMode): string {
  if (mode.kind === 'side' && mode.pair) return 'grid min-h-0 flex-1 grid-cols-2 gap-3'
  if (mode.kind === 'scroll') return 'flex flex-col gap-3'
  return 'flex min-h-0 flex-1 flex-col gap-3 overflow-hidden'
}

export function recCoverClass(mode: MeetingMode): string {
  if (mode.kind === 'split') {
    return 'h-full min-h-40 max-h-80 w-36 shrink-0 self-stretch ring-1 ring-gold/30'
  }
  if (recsFill(mode)) return 'h-56 w-32 shrink-0 ring-1 ring-gold/30'
  return 'h-20 w-14 shrink-0'
}
