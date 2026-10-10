import { describe, expect, it } from 'vitest'
import { GOOGLE_SIGN_IN_PATHS, googleSignInPath, isCancelledGoogleSignIn } from './signInPath'

describe('googleSignInPath', () => {
  it('uses a popup on the website', () => {
    expect(googleSignInPath(false)).toBe('popup')
  })

  it('uses a native credential in the store app', () => {
    expect(googleSignInPath(true)).toBe('native-credential')
  })

  it('never chooses a redirect', () => {
    expect(GOOGLE_SIGN_IN_PATHS).toEqual(['popup', 'native-credential'])
    expect(googleSignInPath(false)).not.toBe('redirect')
    expect(googleSignInPath(true)).not.toBe('redirect')
  })
})

describe('isCancelledGoogleSignIn', () => {
  it('treats a closed popup as a cancellation', () => {
    expect(isCancelledGoogleSignIn('auth/popup-closed-by-user', '')).toBe(true)
  })

  it('treats a dismissed native Google sheet as a cancellation', () => {
    expect(isCancelledGoogleSignIn('', 'The user canceled the sign-in flow.')).toBe(true)
  })

  it('does not hide other sign-in failures', () => {
    expect(isCancelledGoogleSignIn('auth/popup-blocked', 'The popup was blocked.')).toBe(false)
  })
})
