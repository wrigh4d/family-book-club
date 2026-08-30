import {useEffect, useState} from 'react'
import type {ClubState} from '../types'
import {useAuth} from './auth'
import {normalizeClubCode} from './codes'
import {friendlyFirebaseError} from './errors'
import {joinClub, subscribeClub} from './store'

export function useClub(rawCode: string) {
    const code = normalizeClubCode(rawCode)
    const {uid, displayName, ready, error: authError, setDisplayName} = useAuth()
    const [state, setState] = useState<ClubState | null>(null)
    const [localError, setLocalError] = useState<string | null>(null)

    useEffect(() => {
        if (!ready || !uid || !displayName || !code) return
        let stop: (() => void) | undefined
        let cancelled = false
        joinClub(code, uid, displayName)
            .then(() => {
                if (cancelled) return
                stop = subscribeClub(code, setState, (err) =>
                    setLocalError(friendlyFirebaseError(err)),
                )
            })
            .catch((err) => {
                if (!cancelled) setLocalError(friendlyFirebaseError(err))
            })
        return () => {
            cancelled = true
            stop?.()
        }
    }, [ready, uid, displayName, code])

    return {
        code,
        uid,
        displayName,
        ready,
        state,
        error: localError ?? authError,
        setError: setLocalError,
        setDisplayName,
    }
}
