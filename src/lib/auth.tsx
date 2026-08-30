import {createContext, type ReactNode, useContext, useEffect, useMemo, useState,} from 'react'
import {onAuthStateChanged, signInAnonymously} from 'firebase/auth'
import {auth} from './firebase'
import {loadProfile, saveProfile} from './store'
import {friendlyFirebaseError} from './errors'

type AuthValue = {
    uid: string | null
    displayName: string | null
    ready: boolean
    error: string | null
    setDisplayName: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({children}: { children: ReactNode }) {
    const [uid, setUid] = useState<string | null>(null)
    const [displayName, setName] = useState<string | null>(null)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            try {
                if (!user) {
                    const cred = await signInAnonymously(auth)
                    setUid(cred.user.uid)
                    setName(null)
                    setReady(true)
                    return
                }
                setUid(user.uid)
                const saved = await loadProfile(user.uid)
                setName(saved)
                setError(null)
                setReady(true)
            } catch (err) {
                setError(friendlyFirebaseError(err))
                setReady(true)
            }
        })
        return unsub
    }, [])

    const value = useMemo<AuthValue>(
        () => ({
            uid,
            displayName,
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
        }),
        [uid, displayName, ready, error],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
