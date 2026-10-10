import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  asGenre,
  type ClubState,
  type Genre,
} from '../types'
import {
  assertCanJoinShortlist,
  findMatchingClubBook,
  staleShortlist,
} from './bookStatus'
import { parseGenreList } from './clubParse'
import { db } from './firebase'
import { stateWithHistory } from './storeLive'

function clubRef(code: string) {
  return doc(db, 'clubs', code)
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
    text: trimmed.slice(0, 500),
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
  await setDoc(doc(clubRef(code), 'rounds', roundId, 'genreVotes', uid), {
    genres: parseGenreList(genres),
  })
}

export async function migrateRoundNominationsToShortlist(
  code: string,
  roundId: string,
  hasShortlist = false,
): Promise<void> {
  if (hasShortlist) return
  const shortSnap = await getDocs(collection(clubRef(code), 'shortlist'))
  if (!shortSnap.empty) return
  const oldSnap = await getDocs(collection(clubRef(code), 'rounds', roundId, 'nominations'))
  if (oldSnap.empty) return
  const batch = writeBatch(db)
  for (const row of oldSnap.docs) {
    batch.set(doc(clubRef(code), 'shortlist', row.id), row.data())
  }
  await batch.commit()
}

export async function addNomination(
  code: string,
  uid: string,
  displayName: string,
  book: {
    olid: string
    title: string
    author: string
    coverUrl: string | null
    genre: Genre
    firstPublishYear?: number | null
    pageCount?: number | null
  },
  state: ClubState,
): Promise<string> {
  const full = await stateWithHistory(code, state)
  assertCanJoinShortlist(full, book)
  await pruneLoadedShortlist(code, full)
  const listed = findMatchingClubBook(book, full.nominations)
  if (listed) return listed.id
  const ref = await addDoc(collection(clubRef(code), 'shortlist'), {
    olid: book.olid,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl ?? null,
    genre: asGenre(book.genre),
    firstPublishYear: book.firstPublishYear ?? null,
    pageCount: book.pageCount ?? null,
    nominatedBy: uid,
    nominatedByName: displayName,
    alreadyReadBy: [],
    createdAt: Date.now(),
  })
  return ref.id
}

export async function toggleAlreadyRead(
  code: string,
  nominationId: string,
  uid: string,
  already: boolean,
): Promise<void> {
  await updateDoc(doc(clubRef(code), 'shortlist', nominationId), {
    alreadyReadBy: already ? arrayRemove(uid) : arrayUnion(uid),
  })
}

export async function removeFromShortlist(code: string, nominationId: string): Promise<void> {
  await deleteDoc(doc(clubRef(code), 'shortlist', nominationId))
}

export async function pruneLoadedShortlist(code: string, state: ClubState): Promise<void> {
  const stale = staleShortlist(state)
  if (stale.length === 0) return
  const batch = writeBatch(db)
  for (const book of stale) {
    batch.delete(doc(clubRef(code), 'shortlist', book.id))
  }
  await batch.commit()
}

export async function pruneShortlist(code: string, state: ClubState): Promise<void> {
  await pruneLoadedShortlist(code, await stateWithHistory(code, state))
}

export function currentRoundHasVotes(votes: Record<string, Genre[]>): boolean {
  return Object.values(votes).some((genres) => genres.length > 0)
}

export async function seedGenreVotesFromPreviousRound(
  code: string,
  roundId: string,
  previousRoundId: string | null,
): Promise<void> {
  if (!previousRoundId || previousRoundId === roundId) return
  const votesSnap = await getDocs(
    collection(clubRef(code), 'rounds', previousRoundId, 'genreVotes'),
  )
  const pending = votesSnap.docs.flatMap((row) => {
    const genres = parseGenreList(row.data().genres)
    return genres.length > 0 ? [{ userId: row.id, genres }] : []
  })
  if (pending.length === 0) return
  const batch = writeBatch(db)
  for (const { userId, genres } of pending) {
    batch.set(doc(clubRef(code), 'rounds', roundId, 'genreVotes', userId), { genres })
  }
  await batch.commit()
}
