import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import {
  type Club,
  type ClubState,
  type Genre,
  type HistoryBook,
  type Member,
  type Nomination,
  type Round,
  type Rule,
} from '../types'
import {
  asClub,
  asHistory,
  asMember,
  asNomination,
  asRound,
  asRule,
  parseGenreList,
} from './clubParse'
import { db } from './firebase'

function clubRef(code: string) {
  return doc(db, 'clubs', code)
}

function dataOf(snap: { data: () => unknown }): Record<string, unknown> {
  return (snap.data() ?? {}) as Record<string, unknown>
}

const historyLiveReady = new Set<string>()

export function subscribeClub(
  code: string,
  onData: (state: ClubState) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const unsubscribers: Unsubscribe[] = []
  let club: Club | null = null
  let members: Member[] = []
  let rules: Rule[] = []
  let round: Round | null = null
  let genreVotes: Record<string, Genre[]> = {}
  let nominations: Nomination[] = []
  let history: HistoryBook[] = []
  let roundUnsubs: Unsubscribe[] = []
  let listenedRoundId: string | null = null
  let emitScheduled = false
  let initialEmitted = false
  const got = {
    club: false,
    members: false,
    rules: false,
    shortlist: false,
    history: false,
    round: false,
    genreVotes: false,
  }

  const publish = () => {
    if (!club) return
    onData({ club, members, rules, round, genreVotes, nominations, history })
  }

  const emit = () => {
    if (!club) return
    if (!initialEmitted) {
      if (!(got.club && got.members && got.rules && got.shortlist && got.history)) return
      if (club.currentRoundId && !(got.round && got.genreVotes)) return
      initialEmitted = true
      publish()
      return
    }
    if (emitScheduled) return
    emitScheduled = true
    queueMicrotask(() => {
      emitScheduled = false
      publish()
    })
  }

  const listenToRound = (roundId: string) => {
    if (listenedRoundId === roundId) return
    listenedRoundId = roundId
    got.round = false
    got.genreVotes = false
    for (const stop of roundUnsubs) stop()
    roundUnsubs = []
    const rRef = doc(clubRef(code), 'rounds', roundId)
    roundUnsubs.push(
      onSnapshot(
        rRef,
        (snap) => {
          round = snap.exists() ? asRound(snap.id, dataOf(snap)) : null
          got.round = true
          emit()
        },
        (err) => onError(err),
      ),
      onSnapshot(
        collection(rRef, 'genreVotes'),
        (snap) => {
          genreVotes = {}
          for (const row of snap.docs) {
            genreVotes[row.id] = parseGenreList(row.data().genres)
          }
          got.genreVotes = true
          emit()
        },
        (err) => onError(err),
      ),
    )
  }

  unsubscribers.push(
    onSnapshot(
      clubRef(code),
      (snap) => {
        if (!snap.exists()) {
          onError(new Error('No club with that code.'))
          return
        }
        club = asClub(code, dataOf(snap))
        got.club = true
        if (club.currentRoundId) listenToRound(club.currentRoundId)
        else {
          got.round = true
          got.genreVotes = true
          round = null
          genreVotes = {}
        }
        emit()
      },
      (err) => onError(err),
    ),
    onSnapshot(
      collection(clubRef(code), 'members'),
      (snap) => {
        members = snap.docs
          .map((row) => asMember(row.id, dataOf(row)))
          .sort((a, b) => a.joinedAt - b.joinedAt)
        got.members = true
        emit()
      },
      (err) => onError(err),
    ),
    onSnapshot(
      collection(clubRef(code), 'rules'),
      (snap) => {
        rules = snap.docs
          .map((row) => asRule(row.id, dataOf(row)))
          .sort((a, b) => a.createdAt - b.createdAt)
        got.rules = true
        emit()
      },
      (err) => onError(err),
    ),
    onSnapshot(
      collection(clubRef(code), 'shortlist'),
      (snap) => {
        nominations = snap.docs
          .map((row) => asNomination(row.id, dataOf(row)))
          .sort((a, b) => a.createdAt - b.createdAt)
        got.shortlist = true
        emit()
      },
      (err) => onError(err),
    ),
    onSnapshot(
      collection(clubRef(code), 'history'),
      (snap) => {
        history = snap.docs
          .map((row) => asHistory(row.id, dataOf(row)))
          .sort((a, b) => b.finishedAt - a.finishedAt)
        got.history = true
        historyLiveReady.add(code)
        emit()
      },
      (err) => onError(err),
    ),
  )

  return () => {
    historyLiveReady.delete(code)
    for (const stop of unsubscribers) stop()
    for (const stop of roundUnsubs) stop()
  }
}

export function subscribeClubHistory(
  code: string,
  onData: (history: HistoryBook[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(clubRef(code), 'history'),
    (snap) => {
      onData(
        snap.docs
          .map((row) => asHistory(row.id, dataOf(row)))
          .sort((a, b) => b.finishedAt - a.finishedAt),
      )
    },
    (err) => onError(err),
  )
}

export async function loadClubHistory(code: string): Promise<HistoryBook[]> {
  const snap = await getDocs(collection(clubRef(code), 'history'))
  return snap.docs
    .map((row) => asHistory(row.id, dataOf(row)))
    .sort((a, b) => b.finishedAt - a.finishedAt)
}

export async function stateWithHistory(code: string, state: ClubState): Promise<ClubState> {
  // Live club subscription already carries the full history collection.
  if (historyLiveReady.has(code)) return state
  return { ...state, history: await loadClubHistory(code) }
}
