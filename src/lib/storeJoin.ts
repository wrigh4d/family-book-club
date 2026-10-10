import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { randomClubCode } from './codes'
import { firebaseErrorCode } from './errors'
import { db } from './firebase'

function clubRef(code: string) {
  return doc(db, 'clubs', code)
}

function isPermissionDenied(error: unknown): boolean {
  return firebaseErrorCode(error) === 'permission-denied'
}

function userRef(uid: string) {
  return doc(db, 'users', uid)
}

export async function loadProfile(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const name = snap.data().displayName
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

export async function createClub(name: string, uid: string, displayName: string): Promise<string> {
  const clubName = name.trim()
  if (!clubName) throw new Error('Give the club a name.')
  const person = displayName.trim()
  if (!person) throw new Error('Enter your name.')

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomClubCode()
    const ref = clubRef(code)
    const existing = await getDoc(ref)
    if (existing.exists()) continue

    const now = Date.now()
    const roundRef = doc(collection(ref, 'rounds'))
    const batch = writeBatch(db)
    batch.set(ref, {
      name: clubName,
      code,
      createdBy: uid,
      currentRoundId: roundRef.id,
      previousRoundId: null,
      currentBookId: null,
      currentBook: null,
      createdAt: now,
      dislikedRecs: [],
    })
    batch.set(doc(ref, 'members', uid), {
      displayName: person,
      role: 'owner',
      joinedAt: now,
      uid,
    })
    batch.set(roundRef, { status: 'collecting', startedAt: now })
    batch.update(userRef(uid), {
      [`clubs.${code}`]: {
        name: clubName,
        role: 'owner',
        joinedAt: now,
      },
      updatedAt: now,
    })
    try {
      await batch.commit()
      return code
    } catch (err) {
      if (isPermissionDenied(err)) continue
      throw err
    }
  }
  throw new Error('Could not create a club code. Try again.')
}

export function memberWriteNeeded(
  existing: { displayName?: unknown } | null,
  name: string,
): 'create' | 'rename' | null {
  if (!existing) return 'create'
  const current = typeof existing.displayName === 'string' ? existing.displayName : ''
  return current === name ? null : 'rename'
}

export async function joinClub(
  code: string,
  uid: string,
  displayName: string,
): Promise<{ name: string; role: 'owner' | 'member'; joinedAt: number }> {
  const name = displayName.trim()
  if (!name) throw new Error('Enter your name.')
  const ref = clubRef(code)
  const memberRef = doc(ref, 'members', uid)
  const [snap, memberSnap] = await Promise.all([getDoc(ref), getDoc(memberRef)])
  if (!snap.exists()) throw new Error('No club with that code.')
  const data = snap.data()
  const existingMember = memberSnap.exists() ? memberSnap.data() : null
  const write = memberWriteNeeded(existingMember, name)
  const role: 'owner' | 'member' =
    existingMember?.role === 'owner' || data.createdBy === uid ? 'owner' : 'member'
  const joinedAt =
    typeof existingMember?.joinedAt === 'number' ? existingMember.joinedAt : Date.now()
  if (write === 'rename') {
    await updateDoc(memberRef, { displayName: name, uid })
  } else if (write === 'create') {
    await setDoc(memberRef, {
      displayName: name,
      role,
      joinedAt,
      uid,
    })
    const roundId = typeof data.currentRoundId === 'string' ? data.currentRoundId : ''
    if (roundId && data.createdBy === uid) {
      const roundRef = doc(ref, 'rounds', roundId)
      const roundSnap = await getDoc(roundRef)
      if (!roundSnap.exists()) {
        await setDoc(roundRef, { status: 'collecting', startedAt: Date.now() })
      }
    }
  } else if (existingMember?.uid !== uid) {
    await updateDoc(memberRef, { uid })
  }
  const clubName =
    typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Book club'
  return { name: clubName, role, joinedAt }
}
