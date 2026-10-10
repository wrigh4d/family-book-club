import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import { GoogleAuthProvider, signInWithCredential, type Auth } from 'firebase/auth'

/** Native Google sheet, then the JavaScript SDK owns the Firebase session. */
export async function signInWithNativeGoogleCredential(auth: Auth): Promise<void> {
  const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })
  const idToken = result.credential?.idToken
  if (!idToken) throw new Error('Google did not return an ID token.')
  await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
}

export async function signOutNativeAuth(): Promise<void> {
  await FirebaseAuthentication.signOut()
}
