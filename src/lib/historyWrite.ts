import type { CurrentBook, Genre, HistoryBook } from '../types'
import { appendBookComment, migrateBookComments } from './comments'

export type HistoryHeader = {
  roundId: string
  olid: string
  title: string
  author: string
  coverUrl: string | null
  genre: Genre
}

export type HistoryWrite = {
  data: Record<string, unknown>
  options: { merge: true }
}

function storedRatings(stored: Record<string, unknown> | null): Record<string, number> {
  const ratings = stored?.ratings
  if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) return {}
  return { ...(ratings as Record<string, number>) }
}

function storedSubjects(stored: Record<string, unknown> | null): string[] {
  const subjects = stored?.subjects
  return Array.isArray(subjects) ? subjects.map(String) : []
}

function storedFinish(stored: Record<string, unknown> | null): number | undefined {
  const finishedAt = stored?.finishedAt
  return typeof finishedAt === 'number' && finishedAt > 0 ? finishedAt : undefined
}

function migratedComments(stored: Record<string, unknown> | null) {
  return migrateBookComments({
    comments: stored?.comments,
    notes: stored?.notes,
  })
}

/**
 * Stars for one member. Migrates legacy notes into comments and clears notes.
 * Keeps a finish time only when one is already stored.
 */
export function rateHistoryBook(
  stored: Record<string, unknown> | null,
  input: { header: HistoryHeader; uid: string; stars: number },
  clearNotes: unknown,
): HistoryWrite {
  const ratings = storedRatings(stored)
  ratings[input.uid] = input.stars
  const finish = storedFinish(stored)
  return historySetWithNotesClear(
    {
      ...input.header,
      ...(finish != null ? { finishedAt: finish } : {}),
      ratings,
      comments: migratedComments(stored),
      subjects: storedSubjects(stored),
    },
    clearNotes,
  )
}

/**
 * Appends one comment and clears legacy notes.
 * A blank comment does not write. An existing row keeps its other fields.
 * A missing row starts from the header, with empty ratings.
 */
export function commentHistoryBook(
  stored: Record<string, unknown> | null,
  input: {
    header: HistoryHeader
    uid: string
    name: string
    text: string
    at: number
    id: string
    subjects?: string[]
  },
  clearNotes: unknown,
): HistoryWrite | null {
  const text = input.text.trim()
  if (!text) return null
  const comments = appendBookComment(migratedComments(stored), {
    uid: input.uid,
    name: input.name,
    text,
    at: input.at,
    id: input.id,
  })
  if (stored) return historySetWithNotesClear({ comments }, clearNotes)
  return historySetWithNotesClear(
    {
      ...input.header,
      ratings: {},
      comments,
      subjects: input.subjects ?? [],
    },
    clearNotes,
  )
}

export function finishHistoryFields(
  book: CurrentBook,
  existing: HistoryBook | null,
  roundId: string,
  now: number,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    roundId: existing?.roundId || roundId,
    olid: book.olid,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    genre: book.genre,
    finishedAt: existing && existing.finishedAt > 0 ? existing.finishedAt : now,
  }
  if (!existing) {
    fields.ratings = {}
    fields.comments = []
    fields.subjects = []
  }
  return fields
}

export async function commitReaction(
  io: {
    write: () => Promise<void>
    lookupSubjects: () => Promise<string[]>
    storeSubjects: (subjects: string[]) => Promise<void>
  },
  existingSubjects: string[] | undefined,
  olid: string,
): Promise<void> {
  await io.write()
  if (!olid || (existingSubjects ?? []).length > 0) return
  void io
    .lookupSubjects()
    .then((subjects) => io.storeSubjects(subjects))
    .catch(() => undefined)
}

export function subjectList(subjects: string[], genre: Genre): string[] {
  return subjects.length > 0 ? subjects : [genre]
}

/**
 * Firestore rejects Transaction.set() / WriteBatch.set() that include
 * deleteField() unless options include `{ merge: true }`.
 * History writes clear legacy `notes` while writing `comments[]`.
 */
export function historySetWithNotesClear(
  dataWithoutNotes: Record<string, unknown>,
  clearNotes: unknown,
): HistoryWrite {
  return {
    data: { ...dataWithoutNotes, notes: clearNotes },
    options: { merge: true },
  }
}
