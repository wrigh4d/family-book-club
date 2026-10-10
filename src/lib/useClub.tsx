import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { ClubState } from '../types'
import { useAuth } from './auth'
import { normalizeClubCode } from './codes'
import { friendlyFirebaseError } from './errors'
import {
  isOwner,
  joinClub,
  migrateRoundNominationsToShortlist,
  nextGenreSeed,
  rememberClubMembership,
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
    let cancelled = false

    // Club docs are readable while signed in (membership not required for reads).
    // Start listeners immediately; join/remember in parallel so load is not a waterfall.
    const stop = subscribeClub(
      code,
      (club) => {
        if (!cancelled) setSnapshot({ key: sessionKey, club })
      },
      (err) => {
        if (!cancelled) setLocalError(friendlyFirebaseError(err))
      },
    )

    void joinClub(code, uid, displayName)
      .then((membership) => {
        if (cancelled) return
        return rememberClubMembership(uid, code, membership)
      })
      .catch((err) => {
        if (!cancelled) setLocalError(friendlyFirebaseError(err))
      })

    return () => {
      cancelled = true
      stop()
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
    const decision = nextGenreSeed({
      roundId: state.round.id,
      votes: state.genreVotes,
      previousRoundId: state.club.previousRoundId,
      waitedRoundId: votesWaitedRoundId.current,
      seededRoundId: votesSeededRoundId.current,
    })
    votesWaitedRoundId.current = decision.waitedRoundId
    votesSeededRoundId.current = decision.seededRoundId
    if (decision.action !== 'seed' || !decision.previousRoundId) return
    void seedGenreVotesFromPreviousRound(code, state.round.id, decision.previousRoundId).catch(
      (err) => {
        setLocalError(friendlyFirebaseError(err))
      },
    )
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
