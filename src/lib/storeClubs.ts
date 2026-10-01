import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  type Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore'
import { type ClubMembership, type JoinedClub } from '../types'
import { asClub, asMember, parseUserClubs } from './clubParse'
import { firebaseErrorCode } from './errors'
import { db } from './firebase'

function clubRef(code: string) {
  return doc(db, 'clubs', code)
}

function dataOf(snap: { data: () => unknown }): Record<string, unknown> {
  return (snap.data() ?? {}) as Record<string, unknown>
}

function isIgnorableQueryError(error: unknown): boolean {
  const code = firebaseErrorCode(error)
  return code === 'permission-denied' || code === 'failed-precondition'
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String((error as { code: unknown }).code) === 'not-found'
  )
}

export function clubIdFromMemberPath(path: string): string | null {
  const parts = path.split('/').filter(Boolean)
  if (parts.length >= 4 && parts[0] === 'clubs' && parts[2] === 'members' && parts[1]) {
    return parts[1]
  }
  return null
}

function userRef(uid: string) {
  return doc(db, 'users', uid)
}

function membershipRecord(info: { name: string; role: 'owner' | 'member'; joinedAt: number }) {
  return {
    name: info.name.trim() || 'Book club',
    role: info.role,
    joinedAt: info.joinedAt,
  }
}

async function writeUserClubMemberships(
  uid: string,
  memberships: Array<{ code: string; name: string; role: 'owner' | 'member'; joinedAt: number }>,
  clubsIndexedAt?: number,
): Promise<void> {
  if (memberships.length === 0 && clubsIndexedAt == null) return
  const payload: Record<string, unknown> = { updatedAt: Date.now() }
  if (clubsIndexedAt != null) payload.clubsIndexedAt = clubsIndexedAt
  for (const row of memberships) {
    payload[`clubs.${row.code}`] = membershipRecord(row)
  }
  try {
    await updateDoc(userRef(uid), payload)
  } catch (err) {
    if (!isNotFound(err)) throw err
    const clubs: Record<string, ReturnType<typeof membershipRecord>> = {}
    for (const row of memberships) clubs[row.code] = membershipRecord(row)
    const created: Record<string, unknown> = { clubs, updatedAt: Date.now() }
    if (clubsIndexedAt != null) created.clubsIndexedAt = clubsIndexedAt
    await setDoc(userRef(uid), created, { merge: true })
  }
}

/** Clubs cannot be listed in Firestore; membership is indexed on the user doc. */
export async function rememberClubMembership(
  uid: string,
  code: string,
  info: { name: string; role: 'owner' | 'member'; joinedAt: number },
): Promise<void> {
  await writeUserClubMemberships(uid, [{ code, ...info }])
}

/** A numeric `clubsIndexedAt` means the one-time club scan finished. */
export function needsClubIndex(data: Record<string, unknown> | undefined): boolean {
  return typeof data?.clubsIndexedAt !== 'number'
}

async function collectDiscoveredClubCodes(uid: string): Promise<{ codes: string[]; complete: boolean }> {
  const found = new Set<string>()
  let complete = true
  const miss = (err: unknown) => {
    if (!isIgnorableQueryError(err)) throw err
    complete = false
  }

  // One-time index: run discovery queries in parallel (was sequential).
  // The role-in collection-group covers legacy member docs that omit `uid`.
  const [owned, mine, members] = await Promise.all([
    getDocs(query(collection(db, 'clubs'), where('createdBy', '==', uid))).catch((err) => {
      miss(err)
      return null
    }),
    getDocs(query(collectionGroup(db, 'members'), where('uid', '==', uid))).catch((err) => {
      miss(err)
      return null
    }),
    getDocs(query(collectionGroup(db, 'members'), where('role', 'in', ['owner', 'member']))).catch(
      (err) => {
        miss(err)
        return null
      },
    ),
  ])
  if (owned) for (const row of owned.docs) found.add(row.id)
  if (mine) {
    for (const row of mine.docs) {
      const code = clubIdFromMemberPath(row.ref.path)
      if (code) found.add(code)
    }
  }
  if (members) {
    for (const row of members.docs) {
      if (row.id !== uid) continue
      const code = clubIdFromMemberPath(row.ref.path)
      if (code) found.add(code)
    }
  }

  return { codes: [...found], complete }
}

export async function discoverAndRememberClubs(uid: string): Promise<void> {
  const userSnap = await getDoc(userRef(uid))
  const data = userSnap.exists() ? dataOf(userSnap) : {}
  if (!needsClubIndex(data)) return

  const { codes, complete } = await collectDiscoveredClubCodes(uid)
  const known = new Set(parseUserClubs(data).map((row) => row.code))
  const pending = codes.filter((code) => !known.has(code))
  const toWrite: Array<{ code: string; name: string; role: 'owner' | 'member'; joinedAt: number }> =
    []
  if (pending.length > 0) {
    await Promise.all(
      pending.map(async (code) => {
        const [clubSnap, memberSnap] = await Promise.all([
          getDoc(clubRef(code)),
          getDoc(doc(clubRef(code), 'members', uid)),
        ])
        if (!clubSnap.exists() || !memberSnap.exists()) return
        const club = asClub(code, dataOf(clubSnap))
        const member = asMember(uid, dataOf(memberSnap))
        toWrite.push({
          code,
          name: club.name,
          role: member.role,
          joinedAt: member.joinedAt,
        })
        if (memberSnap.data()?.uid !== uid) {
          await updateDoc(memberSnap.ref, { uid }).catch(() => undefined)
        }
      }),
    )
  }
  await writeUserClubMemberships(uid, toWrite, complete ? Date.now() : undefined)
}

async function hydrateJoinedClubs(
  _uid: string,
  memberships: ClubMembership[],
): Promise<JoinedClub[]> {
  if (memberships.length === 0) return []
  // Membership name/role/joinedAt already live on the user doc. Only fetch each
  // club once for currentBook (+ fresher club name).
  const rows = await Promise.all(
    memberships.map(async (membership) => {
      const cached: JoinedClub = { ...membership, currentBook: null }
      try {
        const clubSnap = await getDoc(clubRef(membership.code))
        if (!clubSnap.exists()) return cached
        const club = asClub(membership.code, dataOf(clubSnap))
        return {
          code: club.code,
          name: club.name,
          role: membership.role,
          joinedAt: membership.joinedAt,
          currentBook: club.currentBook,
        } satisfies JoinedClub
      } catch {
        return cached
      }
    }),
  )
  return rows.sort((a, b) => b.joinedAt - a.joinedAt || a.name.localeCompare(b.name))
}

export function subscribeJoinedClubs(
  uid: string,
  onData: (clubs: JoinedClub[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  let generation = 0
  let cancelled = false
  let discovered = false
  let latest: ClubMembership[] = []
  let hydratedKey: string | null = null

  const emit = (memberships: ClubMembership[]) => {
    if (cancelled) return
    if (!discovered && memberships.length === 0) return
    const key = memberships
      .map((row) => `${row.code}\n${row.name}\n${row.role}\n${row.joinedAt}`)
      .join('\n')
    if (key === hydratedKey) return
    hydratedKey = key
    const myGeneration = ++generation
    void hydrateJoinedClubs(uid, memberships)
      .then((clubs) => {
        if (cancelled || myGeneration !== generation) return
        onData(clubs)
      })
      .catch((err) => {
        if (cancelled || myGeneration !== generation) return
        if (hydratedKey === key) hydratedKey = null
        onError(err instanceof Error ? err : new Error(String(err)))
      })
  }

  const stop = onSnapshot(
    userRef(uid),
    (snap) => {
      latest = parseUserClubs(snap.exists() ? dataOf(snap) : {})
      emit(latest)
    },
    (err) => onError(err),
  )

  void discoverAndRememberClubs(uid)
    .catch((err) => {
      if (!cancelled && !isIgnorableQueryError(err)) {
        onError(err instanceof Error ? err : new Error(String(err)))
      }
    })
    .finally(() => {
      if (cancelled) return
      discovered = true
      emit(latest)
    })

  return () => {
    cancelled = true
    stop()
  }
}
