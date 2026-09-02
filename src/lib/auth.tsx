import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { auth } from './firebase'
import { firebaseErrorCode, friendlyFirebaseError, shouldFallbackToGoogleRedirect } from './errors'
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

function isCancelledSignIn(code: string): boolean {
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [uid, setUid] = useState<string | null>(null)
  const [displayName, setName] = useState<string | null>(null)
  const [suggestedName, setSuggestedName] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let unsub: (() => void) | undefined

    async function start() {
      try {
        await getRedirectResult(auth)
      } catch (err) {
        if (!cancelled && !isCancelledSignIn(firebaseErrorCode(err))) {
          setError(friendlyFirebaseError(err))
        }
      }
      if (cancelled) return
      unsub = onAuthStateChanged(auth, async (user) => {
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
          setName(saved)
          setError(null)
          setReady(true)
        } catch (err) {
          setError(friendlyFirebaseError(err))
          setReady(true)
        }
      })
    }

    void start()
    return () => {
      cancelled = true
      unsub?.()
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
          await signInWithPopup(auth, googleProvider)
        } catch (err) {
          const code = firebaseErrorCode(err)
          if (shouldFallbackToGoogleRedirect(code)) {
            await signInWithRedirect(auth, googleProvider)
            return
          }
          if (isCancelledSignIn(code)) return
          setError(friendlyFirebaseError(err))
          throw err
        }
      },
      signOut: async () => {
        setError(null)
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
