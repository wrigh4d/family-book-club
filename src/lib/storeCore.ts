import {
  doc,
  getDocFromServer,
  setDoc,
} from 'firebase/firestore'
import { type ClubState } from '../types'
import {
  currentHistoryBook,
  currentHistoryId,
  isOwner,
  resolveCurrentBook,
} from './bookStatus'
import { commentsForDisplay, type CommentDisplay } from './comments'
import { db } from './firebase'




export { currentHistoryBook, currentHistoryId, isOwner, resolveCurrentBook }

export function assertOwner(state: ClubState, uid: string): void {
  if (!isOwner(state, uid)) throw new Error('Only the club owner can do that.')
}

export async function saveProfile(uid: string, displayName: string): Promise<void> {
  const ref = userRef(uid)
  const snap = await getDocFromServer(ref)
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
