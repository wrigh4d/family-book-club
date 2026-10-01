import { useEffect, useId, useRef, useState } from 'react'
import {
  guessInstallOsFromNavigator,
  INSTALL_OS_OPTIONS,
  stepsForOs,
  type InstallOs,
} from '../lib/installGuide'
import { isStandaloneDisplay } from '../lib/pwa'
import { Button, Chip, TextButton } from './ui'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Opt-in install help: a quiet button opens an OS picker and short steps.
 * Hidden when the app is already running as an installed PWA.
 */
export function InstallHint() {
  const [open, setOpen] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [standalone] = useState(isStandaloneDisplay)

  useEffect(() => {
    if (standalone) return

    function onBeforeInstall(event: Event) {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [standalone])

  if (standalone) return null

  return (
    <>
      <aside
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/30 bg-paper px-3.5 py-3 shadow-[var(--shadow-card)]"
        aria-label="Install app"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Use it like an app</p>
          <p className="mt-0.5 text-sm text-ink/70">Add to your home screen for a full-screen feel.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
          How to install
        </Button>
      </aside>
      {open ? (
        <InstallTutorialModal
          deferred={deferred}
          onClose={() => setOpen(false)}
          onInstalled={() => setDeferred(null)}
        />
      ) : null}
    </>
  )
}

function InstallTutorialModal({
  deferred,
  onClose,
  onInstalled,
}: {
  deferred: BeforeInstallPromptEvent | null
  onClose: () => void
  onInstalled: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [os, setOs] = useState<InstallOs>(() => guessInstallOsFromNavigator())
  const [busy, setBusy] = useState(false)
  const steps = stepsForOs(os)
  const showNativeInstall = Boolean(deferred) && os !== 'ios'

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function install() {
    if (!deferred || busy) return
    setBusy(true)
    try {
      await deferred.prompt()
      await deferred.userChoice
      onInstalled()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-t-2xl border border-rule/90 bg-paper shadow-[var(--shadow-lift)] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-rule/70 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-xl leading-tight tracking-tight">
              Install Book Club
            </h2>
            <p className="mt-0.5 text-xs text-ink/55">Pick your device, then follow the steps.</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close install guide"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/60 transition hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <p className="mb-2 text-sm font-semibold text-ink/80">Your device</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose device">
            {INSTALL_OS_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                selected={os === option.id}
                onClick={() => setOs(option.id)}
              >
                {option.label}
              </Chip>
            ))}
          </div>

          <ol className="mt-5 flex flex-col gap-3">
            {steps.map((step, index) => (
              <li
                key={`${os}-${step.title}`}
                className="flex gap-3 rounded-xl border border-rule/50 bg-cream/90 px-3.5 py-3"
              >
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-burgundy/10 text-sm font-semibold text-burgundy"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-snug text-ink/70">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-rule/70 px-4 py-3 sm:px-5">
          <TextButton className="mr-auto no-underline" onClick={onClose}>
            Close
          </TextButton>
          {showNativeInstall ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => void install()}>
              Install now
            </Button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
