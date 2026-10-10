export type InstallOs = 'ios' | 'android' | 'desktop'

export type InstallStep = {
  title: string
  detail: string
}

export const INSTALL_OS_OPTIONS: { id: InstallOs; label: string }[] = [
  { id: 'ios', label: 'iPhone' },
  { id: 'android', label: 'Android' },
  { id: 'desktop', label: 'Desktop' },
]

const STEPS: Record<InstallOs, InstallStep[]> = {
  ios: [
    {
      title: 'Open in Safari',
      detail: 'Use Safari on your iPhone. Other browsers may not show Add to Home Screen.',
    },
    {
      title: 'Tap Share',
      detail: 'Tap the Share icon at the bottom of Safari (square with an arrow up).',
    },
    {
      title: 'Add to Home Screen',
      detail: 'Scroll the sheet and tap Add to Home Screen.',
    },
    {
      title: 'Confirm Add',
      detail: 'Tap Add in the top right. Book Club appears on your home screen.',
    },
  ],
  android: [
    {
      title: 'Open in Chrome',
      detail: 'Use Chrome on your Android phone for the install option.',
    },
    {
      title: 'Open the menu',
      detail: 'Tap the three-dot menu in the top right of Chrome.',
    },
    {
      title: 'Install or Add',
      detail: 'Tap Install app or Add to Home screen.',
    },
    {
      title: 'Confirm',
      detail: 'Tap Install. Book Club opens like an app from your home screen.',
    },
  ],
  desktop: [
    {
      title: 'Look in the address bar',
      detail: 'In Chrome or Edge, look for an install icon on the right side of the address bar.',
    },
    {
      title: 'Or use the browser menu',
      detail: 'Open the browser menu and choose Install Book Club or Install app.',
    },
    {
      title: 'Confirm Install',
      detail: 'Confirm the prompt. Book Club opens in its own window.',
    },
  ],
}

export function stepsForOs(os: InstallOs): InstallStep[] {
  return STEPS[os]
}

/** Guess a default OS for the picker from a user-agent string. Defaults to desktop. */
export function guessInstallOs(userAgent: string): InstallOs {
  if (/iPad|iPhone|iPod/i.test(userAgent)) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'desktop'
}

/** Prefer navigator signals so iPadOS (MacIntel + touch) maps to iOS. */
export function guessInstallOsFromNavigator(
  nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator,
): InstallOs {
  if (
    /iPad|iPhone|iPod/i.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  ) {
    return 'ios'
  }
  if (/Android/i.test(nav.userAgent)) return 'android'
  return 'desktop'
}
