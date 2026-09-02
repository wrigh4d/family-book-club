import { describe, expect, it } from 'vitest'
import { firebaseErrorCode, friendlyFirebaseError, shouldFallbackToGoogleRedirect } from './errors'

describe('firebaseErrorCode', () => {
  it('reads a Firebase error code', () => {
    expect(firebaseErrorCode({ code: 'auth/unauthorized-domain' })).toBe('auth/unauthorized-domain')
  })

  it('returns empty string for unknown values', () => {
    expect(firebaseErrorCode('nope')).toBe('')
    expect(firebaseErrorCode(null)).toBe('')
  })
})

describe('shouldFallbackToGoogleRedirect', () => {
  it('falls back when the popup cannot run', () => {
    expect(shouldFallbackToGoogleRedirect('auth/popup-blocked')).toBe(true)
    expect(shouldFallbackToGoogleRedirect('auth/operation-not-supported-in-this-environment')).toBe(
      true,
    )
  })

  it('does not treat a closed popup as a redirect case', () => {
    expect(shouldFallbackToGoogleRedirect('auth/popup-closed-by-user')).toBe(false)
    expect(shouldFallbackToGoogleRedirect('auth/cancelled-popup-request')).toBe(false)
  })
})

describe('friendlyFirebaseError', () => {
  it('explains a missing Google provider', () => {
    expect(friendlyFirebaseError({ code: 'auth/operation-not-allowed' })).toMatch(/Google sign-in/)
  })

  it('explains an unauthorized domain', () => {
    expect(friendlyFirebaseError({ code: 'auth/unauthorized-domain' })).toMatch(
      /authorized domain/i,
    )
  })

  it('explains a blocked popup', () => {
    expect(friendlyFirebaseError({ code: 'auth/popup-blocked' })).toMatch(/popup/)
  })
})
