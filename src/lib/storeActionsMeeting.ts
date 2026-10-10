import {
  collection,
  type DocumentReference,
  deleteDoc,
  deleteField,
  doc,
  runTransaction,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  type AppRecommendation,
  asGenre,
  type ClubState,
  type CurrentBook,
  type SuggestionSnapshot,
} from '../types'
import {
  assertCanBeNextBook,
  findMatchingClubBook,
  isSameRecommendedBook,
  unfinishedHistoryForCurrent,
} from './bookStatus'
import { db } from './firebase'
import { fetchWorkSubjects } from './openLibrary'
import { computeMeetingRecs } from './recs'
import { scoreNominations } from './suggestion'
import {
  commentHistoryBook,
  commitReaction,
  finishHistoryFields,
  rateHistoryBook,
  subjectList,
  type HistoryHeader,
} from './historyWrite'
import { assertOwner, currentHistoryId, resolveCurrentBook } from './storeCore'
import { pruneLoadedShortlist } from './storeActionsShortlist'

function clubRef(code: string) {
  return doc(db, 'clubs', code)
}

function snapshotFromState(
  state: ClubState,
  recs?: {
    genreRecommendation?: AppRecommendation | null
    ratingsRecommendation?: AppRecommendation | null
  },
): SuggestionSnapshot {
  const ranked = scoreNominations(state.nominations, state.genreVotes, state.history)
  const winner = ranked[0]
  const current = resolveCurrentBook(state)
  const genreRec = recs?.genreRecommendation ?? state.round?.genreRecommendation
  return {
    nominationId: winner?.id ?? '',
    title: winner?.title ?? current?.title ?? genreRec?.title ?? 'Meeting',
    author: winner?.author ?? current?.author ?? genreRec?.author ?? '',
    coverUrl: winner?.coverUrl ?? current?.coverUrl ?? genreRec?.coverUrl ?? null,
    genre: winner?.genre ?? 'Literary',
    why: winner?.why ?? '',
    shortlist: ranked.slice(winner ? 1 : 0).map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
    })),
    genreRecommendation: genreRec ?? null,
    ratingsRecommendation:
      recs?.ratingsRecommendation ?? state.round?.ratingsRecommendation ?? null,
  }
}

export async function startPresenting(code: string, state: ClubState, uid: string): Promise<void> {
  assertOwner(state, uid)
  if (!state.round) throw new Error('No active round.')
  const computed = await computeMeetingRecs(state)
  const recs = {
    genreRecommendation: computed.genre,
    ratingsRecommendation: computed.ratings,
  }
  const suggestion = snapshotFromState(state, recs)
  await updateDoc(doc(clubRef(code), 'rounds', state.round.id), {
    status: 'presenting',
    lockedAt: Date.now(),
    suggestion,
    genreRecommendation: computed.genre,
    ratingsRecommendation: computed.ratings,
  })
}

export async function startConcluding(code: string, state: ClubState, uid: string): Promise<void> {
  assertOwner(state, uid)
  if (!state.round) throw new Error('No active round.')
  await updateDoc(doc(clubRef(code), 'rounds', state.round.id), { status: 'concluding' })
}

function toCurrentBook(book: CurrentBook): CurrentBook {
  return {
    olid: book.olid || '',
    title: book.title,
    author: book.author || '',
    coverUrl: book.coverUrl ?? null,
    genre: asGenre(book.genre),
    firstPublishYear: book.firstPublishYear ?? null,
    pageCount: book.pageCount ?? null,
  }
}

export async function setStartingBook(
  code: string,
  state: ClubState,
  uid: string,
  book: CurrentBook,
): Promise<void> {
  assertOwner(state, uid)
  assertCanBeNextBook(state, book)
  const listed = findMatchingClubBook(book, state.nominations)
  if (listed) await deleteDoc(doc(clubRef(code), 'shortlist', listed.id))
  await updateDoc(clubRef(code), {
    currentBook: toCurrentBook(book),
    currentBookId: book.olid || null,
  })
}

export async function changeCurrentBook(
  code: string,
  state: ClubState,
  uid: string,
  book: CurrentBook,
): Promise<void> {
  assertOwner(state, uid)
  if (!resolveCurrentBook(state)) throw new Error('No current book.')
  if (state.round && state.round.status !== 'collecting') {
    throw new Error('Finish or leave presenting before changing the current book.')
  }
  assertCanBeNextBook(state, book)

  const batch = writeBatch(db)
  const historyIds = new Set<string>()
  const currentId = currentHistoryId(state)
  if (currentId) historyIds.add(currentId)
  for (const row of unfinishedHistoryForCurrent(state)) {
    historyIds.add(row.id)
  }
  for (const id of historyIds) {
    batch.delete(doc(clubRef(code), 'history', id))
  }

  const listed = findMatchingClubBook(book, state.nominations)
  if (listed) batch.delete(doc(clubRef(code), 'shortlist', listed.id))

  batch.update(clubRef(code), {
    currentBook: toCurrentBook(book),
    currentBookId: book.olid || null,
  })
  if (state.round?.selectedNominationId) {
    batch.update(doc(clubRef(code), 'rounds', state.round.id), {
      selectedNominationId: deleteField(),
    })
  }
  await batch.commit()
}

export async function pickNextBook(
  code: string,
  state: ClubState,
  uid: string,
  book: CurrentBook | null,
): Promise<void> {
  assertOwner(state, uid)
  if (!state.round) throw new Error('No active round.')
  if (book) assertCanBeNextBook(state, book)
  await pruneLoadedShortlist(code, state)
  const shown = [
    state.round.genreRecommendation,
    state.round.ratingsRecommendation,
    state.round.suggestion?.genreRecommendation,
    state.round.suggestion?.ratingsRecommendation,
  ].filter((rec): rec is AppRecommendation => Boolean(rec?.olid))
  const ignored = shown.filter((rec) => {
    if (book && isSameRecommendedBook(rec, [book])) return false
    return !state.nominations.some((item) => isSameRecommendedBook(rec, [item]))
  })
  const dislikedRecs = [...state.club.dislikedRecs]
  for (const rec of ignored) {
    if (!isSameRecommendedBook(rec, dislikedRecs)) {
      dislikedRecs.push({ olid: rec.olid, title: rec.title })
    }
  }

  const batch = writeBatch(db)
  const outgoing = resolveCurrentBook(state)
  const outgoingId = currentHistoryId(state)
  if (outgoing && outgoingId) {
    const existing = state.history.find((row) => row.id === outgoingId) ?? null
    batch.set(
      doc(clubRef(code), 'history', outgoingId),
      finishHistoryFields(outgoing, existing, state.round.id, Date.now()),
      { merge: true },
    )
  }
  if (book) {
    const listed = findMatchingClubBook(book, state.nominations)
    if (listed) batch.delete(doc(clubRef(code), 'shortlist', listed.id))
  }
  const roundRef = doc(collection(clubRef(code), 'rounds'))
  batch.set(roundRef, { status: 'collecting', startedAt: Date.now() })
  for (const [userId, genres] of Object.entries(state.genreVotes)) {
    if (genres.length > 0) {
      batch.set(doc(clubRef(code), 'rounds', roundRef.id, 'genreVotes', userId), { genres })
    }
  }
  batch.update(clubRef(code), {
    currentRoundId: roundRef.id,
    previousRoundId: state.round.id,
    currentBookId: book?.olid ?? null,
    currentBook: book ? toCurrentBook(book) : null,
    dislikedRecs,
  })
  await batch.commit()
}

function historyHeader(book: CurrentBook, roundId: string, olid: string): HistoryHeader {
  return {
    roundId,
    olid,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    genre: asGenre(book.genre),
  }
}

function commentStamp(): { id: string; at: number } {
  const at = Date.now()
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `c-${at}-${Math.random().toString(36).slice(2, 10)}`
  return { id, at }
}

async function upsertCurrentHistory(
  code: string,
  state: ClubState,
  uid: string,
  stars: number,
): Promise<void> {
  const book = resolveCurrentBook(state)
  const historyId = currentHistoryId(state)
  if (!book || !historyId || !state.round) throw new Error('No current book.')
  const historyRef = doc(clubRef(code), 'history', historyId)
  const existing = state.history.find((row) => row.id === historyId)
  const olid = book.olid ?? existing?.olid ?? ''
  const knownSubjects = existing?.subjects ?? []
  const header = historyHeader(book, state.round.id, olid)
  await commitReaction(
    {
      write: () => writeRating(historyRef, header, uid, stars),
      lookupSubjects: () => fetchWorkSubjects(olid),
      storeSubjects: (subjects) => storeHistorySubjects(historyRef, subjects, book.genre),
    },
    knownSubjects,
    olid,
  )
}

async function writeRating(
  historyRef: DocumentReference,
  header: HistoryHeader,
  uid: string,
  stars: number,
): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(historyRef)
    const stored = snap.exists() ? (snap.data() as Record<string, unknown>) : null
    const { data, options } = rateHistoryBook(stored, { header, uid, stars }, deleteField())
    tx.set(historyRef, data, options)
  })
}

async function storeHistorySubjects(
  historyRef: DocumentReference,
  subjects: string[],
  genre: CurrentBook['genre'],
): Promise<void> {
  const list = subjectList(subjects, genre)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(historyRef)
    if (!snap.exists()) return
    const stored = snap.data().subjects
    if (Array.isArray(stored) && stored.length > 0) return
    tx.update(historyRef, { subjects: list })
  })
}

async function appendCommentToHistory(
  historyRef: DocumentReference,
  input: { uid: string; name: string; text: string; at: number; id: string },
  header: HistoryHeader,
  subjects: string[],
): Promise<void> {
  if (!input.text.trim()) return
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(historyRef)
    const stored = snap.exists() ? (snap.data() as Record<string, unknown>) : null
    const write = commentHistoryBook(stored, { ...input, header, subjects }, deleteField())
    if (!write) return
    tx.set(historyRef, write.data, write.options)
  })
}

export async function rateCurrentBook(
  code: string,
  state: ClubState,
  uid: string,
  stars: number,
): Promise<void> {
  await upsertCurrentHistory(code, state, uid, stars)
}

export async function savePersonalNote(
  code: string,
  state: ClubState,
  uid: string,
  note: string,
): Promise<void> {
  const book = resolveCurrentBook(state)
  const historyId = currentHistoryId(state)
  if (!book || !historyId || !state.round) throw new Error('No current book.')
  const roundId = state.round.id
  const name = state.members.find((member) => member.id === uid)?.displayName ?? 'Reader'
  const historyRef = doc(clubRef(code), 'history', historyId)
  const existing = state.history.find((row) => row.id === historyId)
  const olid = book.olid ?? existing?.olid ?? ''
  const stamp = commentStamp()
  await commitReaction(
    {
      write: () =>
        appendCommentToHistory(
          historyRef,
          { uid, name, text: note, ...stamp },
          historyHeader(book, roundId, olid),
          existing?.subjects ?? [],
        ),
      lookupSubjects: () => fetchWorkSubjects(olid),
      storeSubjects: (subjects) => storeHistorySubjects(historyRef, subjects, book.genre),
    },
    existing?.subjects,
    olid,
  )
}
