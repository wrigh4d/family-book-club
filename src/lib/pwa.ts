const INSTALL_HINT_KEY = 'family-book-club:install-hint-dismissed'

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function installHintDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_HINT_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissInstallHint(): void {
  try {
    localStorage.setItem(INSTALL_HINT_KEY, '1')
  } catch {
    // private mode / blocked storage — treat as dismissed for this session
  }
}
