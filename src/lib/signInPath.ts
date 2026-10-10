export const GOOGLE_SIGN_IN_PATHS = ['popup', 'native-credential'] as const

export type GoogleSignInPath = (typeof GOOGLE_SIGN_IN_PATHS)[number]

/** Website uses a Google popup. The store app uses a native ID token. Redirect is not a path. */
export function googleSignInPath(storeApp: boolean): GoogleSignInPath {
  return storeApp ? 'native-credential' : 'popup'
}

/** A closed popup or a dismissed native sheet is not a failure to show. */
export function isCancelledGoogleSignIn(code: string, message: string): boolean {
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return true
  return /user canceled the sign-in|user cancelled the sign-in/i.test(message)
}
