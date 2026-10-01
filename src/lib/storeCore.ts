import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore'
import {
  type ClubState,
  type CurrentBook,
  type HistoryBook,
} from '../types'
import { historyDocId } from './bookStatus'
import { commentsForDisplay, type CommentDisplay } from './comments'
import { db } from './firebase'




export function isOwner(state: ClubState, uid: string): boolean {
  return (
    state.club.createdBy === uid ||
    state.members.some((member) => member.id === uid && member.role === 'owner')
  )
}

export function assertOwner(state: ClubState, uid: string): void {
  if (!isOwner(state, uid)) throw new Error('Only the club owner can do that.')
}

export function resolveCurrentBook(state: ClubState): CurrentBook | null {
  if (state.club.currentBook) return state.club.currentBook
  const id = state.club.currentBookId ?? state.round?.selectedNominationId
  const nom = state.nominations.find((row) => row.id === id)
  if (!nom) return null
  return {
    olid: nom.olid,
    title: nom.title,
    author: nom.author,
    coverUrl: nom.coverUrl,
    genre: nom.genre,
    firstPublishYear: nom.firstPublishYear,
    pageCount: nom.pageCount,
  }
}

export function currentHistoryId(state: ClubState): string | null {
  const book = resolveCurrentBook(state)
  if (!book?.olid) return null
  return historyDocId(book.olid)
}

export function currentHistoryBook(state: ClubState): HistoryBook | null {
  const historyId = currentHistoryId(state)
  if (!historyId) return null
  return state.history.find((row) => row.id === historyId) ?? null
}

export async function saveProfile(uid: string, displayName: string): Promise<void> {
  const ref = userRef(uid)
  const snap = await getDoc(ref)
  const payload: Record<string, unknown> = {
    displayName: displayName.trim(),
    updatedAt: Date.now(),
  }
  // New accounts have no legacy member rows, so they never need the one-time club scan.
  if (!snap.exists()) payload.clubsIndexedAt = Date.now()
  await setDoc(ref, payload, { merge: true })
}

function userRef(uid: string) {
  return doc(db, 'users', uid)
}

/** All club comments on the current book, newest first. */
export function clubBookComments(state: ClubState): CommentDisplay[] {
  return commentsForDisplay(currentHistoryBook(state)?.comments ?? [], state.members)
}

/** @deprecated Prefer clubBookComments — kept for call-site compatibility during rename. */
export function personalNotes(
  state: ClubState,
): Array<{ uid: string; name: string; text: string }> {
  return clubBookComments(state).map((row) => ({
    uid: row.id,
    name: row.name,
    text: row.text,
  }))
}
