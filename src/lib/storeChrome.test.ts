import { describe, expect, it } from 'vitest'
import { storeChrome } from './storeChrome'

describe('storeChrome', () => {
  it('shows the website install hint and the web push prompt', () => {
    expect(storeChrome(false)).toEqual({ showInstallHint: true, pushPrompt: 'web' })
  })

  it('hides the install hint and the push prompt in the store app', () => {
    expect(storeChrome(true)).toEqual({ showInstallHint: false, pushPrompt: 'hidden' })
  })

  it('offers the native push prompt only after native push can save a token', () => {
    expect(storeChrome(true, true)).toEqual({ showInstallHint: false, pushPrompt: 'native' })
  })

  it('keeps the website on the web push prompt even if a native token exists', () => {
    expect(storeChrome(false, true)).toEqual({ showInstallHint: true, pushPrompt: 'web' })
  })
})
