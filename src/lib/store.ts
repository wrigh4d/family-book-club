import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { randomClubCode } from './codes'
import { scoreNominations } from './suggestion'
import type {
  Club,
  ClubState,
  Genre,
  HistoryBook,
  Member,
  Nomination,
  Round,
  Rule,
  SuggestionSnapshot,
} from '../types'

function clubRef(code: string) {
  return doc(db, 'clubs', code)
}

function asClub(code: string, data: DocumentData): Club {
  return {
    name: String(data.name ?? 'Book club'),
    code,
    createdBy: String(data.createdBy ?? ''),
    currentRoundId: String(data.currentRoundId ?? ''),
    currentBookId: data.currentBookId ? String(data.currentBookId) : null,
    createdAt: Number(data.createdAt ?? 0),
  }
}

function asMember(id: string, data: DocumentData): Member {
  return {
    id,
    displayName: String(data.displayName ?? 'Reader'),
    role: data.role === 'owner' ? 'owner' : 'member',
    joinedAt: Number(data.joinedAt ?? 0),
  }
}

function asRule(id: string, data: DocumentData): Rule {
  return {
    id,
    text: String(data.text ?? ''),
    createdBy: String(data.createdBy ?? ''),
    createdByName: String(data.createdByName ?? 'Someone'),
    createdAt: Number(data.createdAt ?? 0),
  }
}

function asNomination(id: string, data: DocumentData): Nomination {
  return {
    id,
    olid: String(data.olid ?? ''),
    title: String(data.title ?? 'Untitled'),
    author: String(data.author ?? 'Unknown'),
    coverUrl: data.coverUrl ? String(data.coverUrl) : null,
    genre: data.genre as Nomination['genre'],
    nominatedBy: String(data.nominatedBy ?? ''),
    nominatedByName: String(data.nominatedByName ?? 'Someone'),
    alreadyReadBy: Array.isArray(data.alreadyReadBy)
      ? data.alreadyReadBy.map(String)
      : [],
    createdAt: Number(data.createdAt ?? 0),
  }
}

function asRound(id: string, data: DocumentData): Round {
  return {
    id,
    status: (data.status as Round['status']) ?? 'collecting',
    startedAt: Number(data.startedAt ?? 0),
    lockedAt: data.lockedAt ? Number(data.lockedAt) : undefined,
    selectedNominationId: data.selectedNominationId
      ? String(data.selectedNominationId)
      : undefined,
    suggestion: data.suggestion as SuggestionSnapshot | undefined,
  }
}

function asHistory(id: string, data: DocumentData): HistoryBook {
  return {
    id,
    roundId: String(data.roundId ?? ''),
    olid: String(data.olid ?? ''),
    title: String(data.title ?? ''),
    author: String(data.author ?? ''),
    coverUrl: data.coverUrl ? String(data.coverUrl) : null,
    genre: data.genre as HistoryBook['genre'],
    finishedAt: Number(data.finishedAt ?? 0),
    ratings:
      data.ratings && typeof data.ratings === 'object'
        ? Object.fromEntries(
            Object.entries(data.ratings as Record<string, unknown>).map(
              ([uid, stars]) => [uid, Number(stars)],
            ),
          )
        : {},
  }
}

export async function saveProfile(uid: string, displayName: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { displayName: displayName.trim(), updatedAt: Date.now() },
    { merge: true },
  )
}

export async function loadProfile(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const name = snap.data().displayName
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export async function createClub(
  name: string,
  uid: string,
  displayName: string,
): Promise<string> {
  const clubName = name.trim()
  if (!clubName) throw new Error('Give the club a name.')

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomClubCode()
    const existing = await getDoc(clubRef(code))
    if (existing.exists()) continue

    const now = Date.now()
    const roundRef = doc(collection(clubRef(code), 'rounds'))
    await setDoc(clubRef(code), {
      name: clubName,
      code,
      createdBy: uid,
      currentRoundId: roundRef.id,
      currentBookId: null,
      createdAt: now,
    })
    await setDoc(doc(clubRef(code), 'members', uid), {
      displayName,
      role: 'owner',
      joinedAt: now,
    })
    await setDoc(roundRef, { status: 'collecting', startedAt: now })
    return code
  }
  throw new Error('Could not create a club code. Try again.')
}

export async function joinClub(
  code: string,
  uid: string,
  displayName: string,
): Promise<void> {
  const snap = await getDoc(clubRef(code))
  if (!snap.exists()) throw new Error('No club with that code.')
  const memberSnap = await getDoc(doc(clubRef(code), 'members', uid))
  if (memberSnap.exists()) {
    await updateDoc(doc(clubRef(code), 'members', uid), { displayName })
    return
  }
  await setDoc(doc(clubRef(code), 'members', uid), {
    displayName,
    role: 'member',
    joinedAt: Date.now(),
  })
}

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

  const emit = () => {
    if (!club) return
    onData({ club, members, rules, round, genreVotes, nominations, history })
  }

  const listenToRound = (roundId: string) => {
    for (const stop of roundUnsubs) stop()
    roundUnsubs = []
    const rRef = doc(clubRef(code), 'rounds', roundId)
    roundUnsubs.push(
      onSnapshot(
        rRef,
        (snap) => {
          round = snap.exists() ? asRound(snap.id, snap.data()) : null
          emit()
        },
        (err) => onError(err),
      ),
      onSnapshot(
        collection(rRef, 'genreVotes'),
        (snap) => {
          genreVotes = {}
          for (const row of snap.docs) {
            const genres = row.data().genres
            genreVotes[row.id] = Array.isArray(genres) ? (genres as Genre[]) : []
          }
          emit()
        },
        (err) => onError(err),
      ),
      onSnapshot(
        collection(rRef, 'nominations'),
        (snap) => {
          nominations = snap.docs
            .map((row) => asNomination(row.id, row.data()))
            .sort((a, b) => a.createdAt - b.createdAt)
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
        club = asClub(code, snap.data())
        if (club.currentRoundId) listenToRound(club.currentRoundId)
        emit()
      },
      (err) => onError(err),
    ),
    onSnapshot(
      collection(clubRef(code), 'members'),
      (snap) => {
        members = snap.docs
          .map((row) => asMember(row.id, row.data()))
          .sort((a, b) => a.joinedAt - b.joinedAt)
        emit()
      },
      (err) => onError(err),
    ),
    onSnapshot(
      collection(clubRef(code), 'rules'),
      (snap) => {
        rules = snap.docs
          .map((row) => asRule(row.id, row.data()))
          .sort((a, b) => a.createdAt - b.createdAt)
        emit()
      },
      (err) => onError(err),
    ),
    onSnapshot(
      collection(clubRef(code), 'history'),
      (snap) => {
        history = snap.docs
          .map((row) => asHistory(row.id, row.data()))
          .sort((a, b) => b.finishedAt - a.finishedAt)
        emit()
      },
      (err) => onError(err),
    ),
  )

  return () => {
    for (const stop of unsubscribers) stop()
    for (const stop of roundUnsubs) stop()
  }
}

export async function addRule(
  code: string,
  text: string,
  uid: string,
  displayName: string,
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Write a rule first.')
  await addDoc(collection(clubRef(code), 'rules'), {
    text: trimmed,
    createdBy: uid,
    createdByName: displayName,
    createdAt: Date.now(),
  })
}

export async function setGenreVotes(
  code: string,
  roundId: string,
  uid: string,
  genres: Genre[],
): Promise<void> {
  await setDoc(doc(clubRef(code), 'rounds', roundId, 'genreVotes', uid), { genres })
}

export async function addNomination(
  code: string,
  roundId: string,
  uid: string,
  displayName: string,
  book: {
    olid: string
    title: string
    author: string
    coverUrl: string | null
    genre: Genre
  },
): Promise<void> {
  await addDoc(collection(clubRef(code), 'rounds', roundId, 'nominations'), {
    ...book,
    nominatedBy: uid,
    nominatedByName: displayName,
    alreadyReadBy: [],
    createdAt: Date.now(),
  })
}

export async function toggleAlreadyRead(
  code: string,
  roundId: string,
  nominationId: string,
  uid: string,
  already: boolean,
): Promise<void> {
  await updateDoc(doc(clubRef(code), 'rounds', roundId, 'nominations', nominationId), {
    alreadyReadBy: already ? arrayRemove(uid) : arrayUnion(uid),
  })
}

function snapshotFromState(state: ClubState): SuggestionSnapshot | null {
  if (!state.nominations.length) return null
  const ranked = scoreNominations(state.nominations, state.genreVotes, state.history)
  const winner = ranked[0]
  if (!winner) return null
  return {
    nominationId: winner.id,
    title: winner.title,
    author: winner.author,
    coverUrl: winner.coverUrl,
    genre: winner.genre,
    why: winner.why,
    shortlist: ranked.slice(1).map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
    })),
  }
}

export async function lockRound(code: string, state: ClubState): Promise<void> {
  if (!state.round) throw new Error('No round to lock.')
  const suggestion = snapshotFromState(state)
  if (!suggestion) throw new Error('Nominate at least one book first.')
  await updateDoc(doc(clubRef(code), 'rounds', state.round.id), {
    status: 'locked',
    lockedAt: Date.now(),
    suggestion,
  })
}

export async function selectBook(
  code: string,
  state: ClubState,
  nominationId: string,
): Promise<void> {
  if (!state.round) throw new Error('No active round.')
  const book = state.nominations.find((row) => row.id === nominationId)
  if (!book) throw new Error('That book is not on the shortlist.')
  const suggestion = state.round.suggestion ?? snapshotFromState(state)
  await updateDoc(doc(clubRef(code), 'rounds', state.round.id), {
    status: 'reading',
    selectedNominationId: nominationId,
    suggestion: suggestion ?? undefined,
  })
  await updateDoc(clubRef(code), { currentBookId: nominationId })
}

export async function rateCurrentBook(
  code: string,
  state: ClubState,
  uid: string,
  stars: number,
): Promise<void> {
  if (!state.round?.selectedNominationId) throw new Error('No current book to rate.')
  const book = state.nominations.find((row) => row.id === state.round?.selectedNominationId)
  const historyId = `${state.round.id}-${state.round.selectedNominationId}`
  const historyRef = doc(clubRef(code), 'history', historyId)
  const existing = state.history.find((row) => row.id === historyId)
  const ratings = { ...(existing?.ratings ?? {}), [uid]: stars }
  await setDoc(historyRef, {
    roundId: state.round.id,
    olid: book?.olid ?? '',
    title: book?.title ?? state.round.suggestion?.title ?? 'Book',
    author: book?.author ?? state.round.suggestion?.author ?? '',
    coverUrl: book?.coverUrl ?? state.round.suggestion?.coverUrl ?? null,
    genre: book?.genre ?? state.round.suggestion?.genre ?? 'Literary',
    finishedAt: existing?.finishedAt ?? Date.now(),
    ratings,
  })
}

export async function startNextRound(code: string, state: ClubState): Promise<void> {
  if (!state.round) throw new Error('No round to close.')
  await updateDoc(doc(clubRef(code), 'rounds', state.round.id), { status: 'done' })
  const roundRef = doc(collection(clubRef(code), 'rounds'))
  await setDoc(roundRef, { status: 'collecting', startedAt: Date.now() })
  await updateDoc(clubRef(code), {
    currentRoundId: roundRef.id,
    currentBookId: null,
  })
}
