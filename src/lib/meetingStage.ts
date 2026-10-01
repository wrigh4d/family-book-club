export type MeetingMode =
  | { kind: 'scroll' }
  | { kind: 'book' }
  | { kind: 'side'; pair: boolean }

/** Stage layout for Present. Secondary carousel always counts as side content when present. */
export function meetingMode(stage: boolean, hasSecondary: boolean): MeetingMode {
  if (!stage) return { kind: 'scroll' }
  if (!hasSecondary) return { kind: 'book' }
  return { kind: 'side', pair: false }
}

export function meetingLocked(mode: MeetingMode): boolean {
  return mode.kind !== 'scroll'
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
      : 'grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.95fr)] xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,1fr)] 2xl:grid-cols-[minmax(0,1.1fr)_minmax(26rem,1.05fr)]'
  const rows = hasShortlist ? 'grid-rows-[minmax(0,1fr)_auto]' : 'grid-rows-[minmax(0,1fr)]'
  return `grid min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:p-4 xl:gap-5 xl:p-5 2xl:gap-6 2xl:p-6 ${columns} ${rows}`
}

export function meetingSideClass(mode: MeetingMode): string {
  if (mode.kind === 'scroll') return 'flex flex-col'
  return 'flex h-full min-h-0 flex-col overflow-hidden'
}

/** Single dominant secondary panel (carousel). Pairing removed. */
export function meetingVoiceClass(mode: MeetingMode): string {
  if (mode.kind === 'scroll') return 'flex flex-col'
  return 'flex min-h-0 flex-1 flex-col overflow-hidden'
}
