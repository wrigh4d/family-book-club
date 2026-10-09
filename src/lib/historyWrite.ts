import type { CurrentBook, Genre, HistoryBook } from '../types'

export type ReactionPatch = { stars?: number; note?: string }

export function reactionFields(
  book: CurrentBook,
  roundId: string,
  uid: string,
  patch: ReactionPatch,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    roundId,
    olid: book.olid,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    genre: book.genre,
  }
  if (patch.stars != null) fields[`ratings.${uid}`] = patch.stars
  if (patch.note != null) fields[`notes.${uid}`] = patch.note
  return fields
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
    fields.notes = {}
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
