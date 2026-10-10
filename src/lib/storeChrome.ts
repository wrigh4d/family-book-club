export type PushPrompt = 'web' | 'native' | 'hidden'

export type StoreChrome = {
  showInstallHint: boolean
  pushPrompt: PushPrompt
}

/**
 * What this install should show.
 * The website keeps the install hint and the web push prompt.
 * The store app hides both until native push can save a token, and then it
 * shows the native prompt only.
 */
export function storeChrome(storeApp: boolean, nativePushReady = false): StoreChrome {
  if (!storeApp) return { showInstallHint: true, pushPrompt: 'web' }
  return {
    showInstallHint: false,
    pushPrompt: nativePushReady ? 'native' : 'hidden',
  }
}
