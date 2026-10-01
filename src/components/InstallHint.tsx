import { useEffect, useState } from 'react'
import {
  dismissInstallHint,
  installHintDismissed,
  isIosDevice,
  isStandaloneDisplay,
} from '../lib/pwa'
import { TextButton } from './ui'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function shouldOfferInstall(): boolean {
  return !isStandaloneDisplay() && !installHintDismissed()
}

export function InstallHint() {
  const [visible, setVisible] = useState(shouldOfferInstall)
  const [ios] = useState(isIosDevice)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (!visible) return

    function onBeforeInstall(event: Event) {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [visible])

  if (!visible) return null

  function close() {
    dismissInstallHint()
    setVisible(false)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    try {
      await deferred.userChoice
    } finally {
      setDeferred(null)
      close()
    }
  }

  const message = ios
    ? 'Share, then Add to Home Screen.'
    : deferred
      ? 'Install for quicker access and a full-screen feel.'
      : 'Add to your home screen for a full-screen feel.'

  return (
    <aside
      className="flex items-start gap-3 rounded-xl border border-gold/35 bg-paper px-3.5 py-3 shadow-[var(--shadow-card)]"
      aria-label="Install app"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">Use it like an app</p>
        <p className="mt-0.5 text-sm text-ink/70">{message}</p>
        {deferred ? (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => void install()}
              className="rounded-lg bg-burgundy px-3 py-2 text-sm font-semibold text-cream transition hover:bg-burgundy-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Install
            </button>
          </div>
        ) : null}
      </div>
      <TextButton className="shrink-0 no-underline" onClick={close} aria-label="Dismiss install tip">
        Dismiss
      </TextButton>
    </aside>
  )
}
