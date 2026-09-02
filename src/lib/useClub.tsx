import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { ClubState } from '../types'
import { useAuth } from './auth'
import { normalizeClubCode } from './codes'
import { friendlyFirebaseError } from './errors'
import {
  currentRoundHasVotes,
  isOwner,
  joinClub,
  migrateRoundNominationsToShortlist,
  seedGenreVotesFromPreviousRound,
  subscribeClub,
} from './store'

export type ClubSession = {
  code: string
  uid: string | null
  displayName: string | null
  suggestedName: string | null
  ready: boolean
  state: ClubState | null
  error: string | null
  setError: (message: string | null) => void
  setDisplayName: (name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const ClubContext = createContext<ClubSession | null>(null)

export function ClubProvider({ children }: { children: ReactNode }) {
  const { code: rawCode = '' } = useParams()
  const code = normalizeClubCode(rawCode)
  const {
    uid,
    displayName,
    suggestedName,
    ready,
    error: authError,
    setDisplayName,
    signInWithGoogle,
    signOut,
  } = useAuth()
  const sessionKey = ready && uid && displayName && code ? `${uid}:${displayName}:${code}` : ''
  const [snapshot, setSnapshot] = useState<{ key: string; club: ClubState | null }>({
    key: '',
    club: null,
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const state = snapshot.key === sessionKey ? snapshot.club : null
  const seededRoundId = useRef<string | null>(null)
  const votesWaitedRoundId = useRef<string | null>(null)
  const votesSeededRoundId = useRef<string | null>(null)

  useEffect(() => {
    seededRoundId.current = null
    votesWaitedRoundId.current = null
    votesSeededRoundId.current = null
    if (!sessionKey || !uid || !displayName || !code) return
    let stop: (() => void) | undefined
    let cancelled = false
    joinClub(code, uid, displayName)
      .then(() => {
        if (cancelled) return
        stop = subscribeClub(
          code,
          (club) => setSnapshot({ key: sessionKey, club }),
          (err) => setLocalError(friendlyFirebaseError(err)),
        )
      })
      .catch((err) => {
        if (!cancelled) setLocalError(friendlyFirebaseError(err))
      })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [sessionKey, uid, displayName, code])

  useEffect(() => {
    if (!state?.round || state.round.status !== 'collecting' || !uid) return
    if (!isOwner(state, uid)) return
    if (seededRoundId.current !== state.round.id && state.nominations.length === 0) {
      seededRoundId.current = state.round.id
      migrateRoundNominationsToShortlist(code, state.round.id, false).catch(() => undefined)
    } else if (state.nominations.length > 0) {
      seededRoundId.current = state.round.id
    }
    if (currentRoundHasVotes(state.genreVotes)) {
      votesWaitedRoundId.current = state.round.id
      return
    }
    if (votesWaitedRoundId.current !== state.round.id) {
      votesWaitedRoundId.current = state.round.id
      return
    }
    if (votesSeededRoundId.current === state.round.id) return
    votesSeededRoundId.current = state.round.id
    if (state.club.previousRoundId) {
      seedGenreVotesFromPreviousRound(code, state.round.id, state.club.previousRoundId).catch(
        () => undefined,
      )
    }
  }, [code, uid, state])

  const value: ClubSession = {
    code,
    uid,
    displayName,
    suggestedName,
    ready,
    state,
    error: localError ?? authError,
    setError: setLocalError,
    setDisplayName,
    signInWithGoogle,
    signOut,
  }

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>
}

export function useClub(): ClubSession {
  const ctx = useContext(ClubContext)
  if (!ctx) throw new Error('useClub must be used inside ClubProvider')
  return ctx
}
