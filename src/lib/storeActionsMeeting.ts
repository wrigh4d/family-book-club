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
  unfinishedHistoryForCurrent,
} from './bookStatus'
import { db } from './firebase'
import { fetchWorkSubjects, isSameRecommendedBook } from './openLibrary'
import { computeMeetingRecs } from './recs'
import { scoreNominations } from './suggestion'
import { stateWithHistory } from './storeLive'
import { appendBookComment, migrateBookComments } from './comments'
import { historySetWithNotesClear } from './historyWrite'
import {
  assertOwner,
  currentHistoryId,
  resolveCurrentBook,
} from './storeCore'
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
  const full = await stateWithHistory(code, state)
  const computed = await computeMeetingRecs(full)
  const recs = {
    genreRecommendation: computed.genre,
    ratingsRecommendation: computed.ratings,
  }
  const suggestion = snapshotFromState(full, recs)
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
  const full = await stateWithHistory(code, state)
  assertOwner(full, uid)
  assertCanBeNextBook(full, book)
  const listed = findMatchingClubBook(book, full.nominations)
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
  const full = await stateWithHistory(code, state)
  assertOwner(full, uid)
  if (!resolveCurrentBook(full)) throw new Error('No current book.')
  if (full.round && full.round.status !== 'collecting') {
    throw new Error('Finish or leave presenting before changing the current book.')
  }
  assertCanBeNextBook(full, book)

  const batch = writeBatch(db)
  const historyIds = new Set<string>()
  const currentId = currentHistoryId(full)
  if (currentId) historyIds.add(currentId)
  for (const row of unfinishedHistoryForCurrent(full)) {
    historyIds.add(row.id)
  }
  for (const id of historyIds) {
    batch.delete(doc(clubRef(code), 'history', id))
  }

  const listed = findMatchingClubBook(book, full.nominations)
  if (listed) batch.delete(doc(clubRef(code), 'shortlist', listed.id))

  batch.update(clubRef(code), {
    currentBook: toCurrentBook(book),
    currentBookId: book.olid || null,
  })
  if (full.round?.selectedNominationId) {
    batch.update(doc(clubRef(code), 'rounds', full.round.id), {
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
  const full = await stateWithHistory(code, state)
  assertOwner(full, uid)
  if (!full.round) throw new Error('No active round.')
  if (book) assertCanBeNextBook(full, book)
  await pruneLoadedShortlist(code, full)
  const shown = [
    full.round.genreRecommendation,
    full.round.ratingsRecommendation,
    full.round.suggestion?.genreRecommendation,
    full.round.suggestion?.ratingsRecommendation,
  ].filter((rec): rec is AppRecommendation => Boolean(rec?.olid))
  const ignored = shown.filter((rec) => {
    if (book && isSameRecommendedBook(rec, [book])) return false
    return !full.nominations.some((item) => isSameRecommendedBook(rec, [item]))
  })
  const dislikedRecs = [...full.club.dislikedRecs]
  for (const rec of ignored) {
    if (!isSameRecommendedBook(rec, dislikedRecs)) {
      dislikedRecs.push({ olid: rec.olid, title: rec.title })
    }
  }

  const batch = writeBatch(db)
  if (book) {
    const listed = findMatchingClubBook(book, full.nominations)
    if (listed) batch.delete(doc(clubRef(code), 'shortlist', listed.id))
  }
  const roundRef = doc(collection(clubRef(code), 'rounds'))
  batch.set(roundRef, { status: 'collecting', startedAt: Date.now() })
  for (const [userId, genres] of Object.entries(full.genreVotes)) {
    if (genres.length > 0) {
      batch.set(doc(clubRef(code), 'rounds', roundRef.id, 'genreVotes', userId), { genres })
    }
  }
  batch.update(clubRef(code), {
    currentRoundId: roundRef.id,
    previousRoundId: full.round.id,
    currentBookId: book?.olid ?? null,
    currentBook: book ? toCurrentBook(book) : null,
    dislikedRecs,
  })
  await batch.commit()
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code: unknown }).code) === 'not-found'
  )
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
  const roundId = state.round.id
  const historyRef = doc(clubRef(code), 'history', historyId)
  const existing = state.history.find((row) => row.id === historyId)
  const olid = book.olid ?? existing?.olid ?? ''
  let subjects = existing?.subjects ?? []
  if (olid && subjects.length === 0) {
    subjects = await fetchWorkSubjects(olid)
    if (subjects.length === 0) subjects = [book.genre]
  }
  const base = {
    roundId,
    olid,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    genre: asGenre(book.genre),
  }
  if (existing) {
    const fields: Record<string, unknown> = { ...base, [`ratings.${uid}`]: stars }
    if ((existing.subjects ?? []).length === 0 && subjects.length > 0) {
      fields.subjects = subjects
    }
    try {
      await updateDoc(historyRef, fields)
      return
    } catch (err) {
      if (!isNotFound(err)) throw err
    }
  }
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(historyRef)
    const row = snap.exists() ? snap.data() : {}
    const ratings =
      row.ratings && typeof row.ratings === 'object'
        ? { ...(row.ratings as Record<string, number>) }
        : {}
    ratings[uid] = stars
    const existingSubjects = Array.isArray(row.subjects) ? row.subjects.map(String) : []
    const comments = migrateBookComments(row)
    const { data, options } = historySetWithNotesClear(
      {
        ...base,
        finishedAt: row.finishedAt ?? Date.now(),
        ratings,
        comments,
        subjects: existingSubjects.length > 0 ? existingSubjects : subjects,
      },
      deleteField(),
    )
    tx.set(historyRef, data, options)
  })
}

async function appendCommentToHistory(
  historyRef: DocumentReference,
  input: { uid: string; name: string; text: string },
  createBase?: Record<string, unknown>,
): Promise<void> {
  const text = input.text.trim()
  if (!text) return
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(historyRef)
    const row = snap.exists() ? snap.data() : {}
    const comments = appendBookComment(migrateBookComments(row), {
      uid: input.uid,
      name: input.name,
      text,
    })
    const basePayload: Record<string, unknown> = { comments }
    if (!snap.exists()) {
      if (!createBase) throw new Error('No current book.')
      Object.assign(basePayload, createBase, {
        finishedAt: Date.now(),
        ratings: {},
      })
    }
    const { data, options } = historySetWithNotesClear(basePayload, deleteField())
    tx.set(historyRef, data, options)
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
  const name = state.members.find((member) => member.id === uid)?.displayName ?? 'Reader'
  const historyRef = doc(clubRef(code), 'history', historyId)
  const existing = state.history.find((row) => row.id === historyId)
  let subjects = existing?.subjects ?? []
  const olid = book.olid ?? existing?.olid ?? ''
  if (olid && subjects.length === 0) {
    subjects = await fetchWorkSubjects(olid)
    if (subjects.length === 0) subjects = [book.genre]
  }
  await appendCommentToHistory(
    historyRef,
    { uid, name, text: note },
    {
      roundId: state.round.id,
      olid,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      genre: asGenre(book.genre),
      subjects,
    },
  )
}

export async function saveHistoryComment(
  code: string,
  historyId: string,
  uid: string,
  name: string,
  note: string,
): Promise<void> {
  await appendCommentToHistory(doc(clubRef(code), 'history', historyId), {
    uid,
    name,
    text: note,
  })
}
