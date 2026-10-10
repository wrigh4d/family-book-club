import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'
import { firebaseErrorCode, friendlyFirebaseError } from './errors'
import { signInWithNativeGoogleCredential, signOutNativeAuth } from './nativeGoogleSignIn'
import { googleSignInPath, isCancelledGoogleSignIn } from './signInPath'
import { isStoreApp } from './storeApp'
import { loadProfile, saveProfile } from './store'

type AuthValue = {
  uid: string | null
  displayName: string | null
  suggestedName: string | null
  ready: boolean
  error: string | null
  setDisplayName: (name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

function suggestedNameFromUser(user: User): string | null {
  const fromGoogle = user.displayName?.trim()
  if (!fromGoogle) return null
  return fromGoogle.split(/\s+/)[0] ?? null
}

function isCancelledSignIn(error: unknown): boolean {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  return isCancelledGoogleSignIn(firebaseErrorCode(error), message)
}

function popupHelpMessage(code: string): string | null {
  if (code === 'auth/popup-blocked') {
    return 'Your browser blocked the Google sign-in window. Allow popups for this site and try again.'
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null)
  const [displayName, setName] = useState<string | null>(null)
  const [suggestedName, setSuggestedName] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // Clear leftover redirect flows without blocking the auth listener.
    // Do not start new redirect sign-ins; Safari/iOS often lose sessionStorage.
    void getRedirectResult(auth).catch((err) => {
      if (!cancelled && !isCancelledSignIn(err)) {
        setError(friendlyFirebaseError(err))
      }
    })

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user?.isAnonymous) {
          await firebaseSignOut(auth)
          return
        }
        if (!user) {
          setUid(null)
          setName(null)
          setSuggestedName(null)
          setReady(true)
          return
        }
        setUid(user.uid)
        setSuggestedName(suggestedNameFromUser(user))
        const saved = await loadProfile(user.uid)
        if (cancelled) return
        setName(saved)
        setError(null)
        setReady(true)
      } catch (err) {
        if (cancelled) return
        setError(friendlyFirebaseError(err))
        setReady(true)
      }
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      uid,
      displayName,
      suggestedName,
      ready,
      error,
      setDisplayName: async (name: string) => {
        if (!uid) throw new Error('Not signed in yet.')
        const trimmed = name.trim()
        if (!trimmed) throw new Error('Enter your name.')
        await saveProfile(uid, trimmed)
        setName(trimmed)
        setError(null)
      },
      signInWithGoogle: async () => {
        setError(null)
        try {
          if (googleSignInPath(isStoreApp()) === 'popup') {
            await signInWithPopup(auth, googleProvider)
            return
          }
          await signInWithNativeGoogleCredential(auth)
        } catch (err) {
          const code = firebaseErrorCode(err)
          if (isCancelledSignIn(err)) return
          setError(popupHelpMessage(code) ?? friendlyFirebaseError(err))
          throw err
        }
      },
      signOut: async () => {
        setError(null)
        if (isStoreApp()) await signOutNativeAuth().catch(() => undefined)
        await firebaseSignOut(auth)
      },
    }),
    [uid, displayName, suggestedName, ready, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
