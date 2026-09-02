import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    collectionGroup,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    runTransaction,
    setDoc,
    type Unsubscribe,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore'
import {asGenre, type AppRecommendation, type Club, type ClubMembership, type ClubState, type CurrentBook, type Genre, type HistoryBook, type JoinedClub, type Member, type Nomination, type Round, type Rule, type SuggestionSnapshot} from '../types'
import {
    assertCanBeNextBook,
    assertCanJoinShortlist,
    findMatchingClubBook,
    historyDocId,
    staleShortlist,
    unfinishedHistoryForCurrent,
} from './bookStatus'
import {asClub, asHistory, asMember, asNomination, asRound, asRule, parseGenreList, parseUserClubs} from './clubParse'
import {randomClubCode} from './codes'
import {firebaseErrorCode} from './errors'
import {db} from './firebase'
import {fetchWorkSubjects, isSameRecommendedBook} from './openLibrary'
import {computeMeetingRecs} from './recs'
import {scoreNominations} from './suggestion'

function clubRef(code: string) {
    return doc(db, 'clubs', code)
}

function isPermissionDenied(error: unknown): boolean {
    return firebaseErrorCode(error) === 'permission-denied'
}

function isIgnorableQueryError(error: unknown): boolean {
    const code = firebaseErrorCode(error)
    return code === 'permission-denied' || code === 'failed-precondition'
}

export function clubIdFromMemberPath(path: string): string | null {
    const parts = path.split('/').filter(Boolean)
    if (parts.length >= 4 && parts[0] === 'clubs' && parts[2] === 'members' && parts[1]) {
        return parts[1]
    }
    return null
}

function dataOf(snap: {data: () => unknown}): Record<string, unknown> {
    return (snap.data() ?? {}) as Record<string, unknown>
}

export function isOwner(state: ClubState, uid: string): boolean {
    return (
        state.club.createdBy === uid ||
        state.members.some((member) => member.id === uid && member.role === 'owner')
    )
}

function assertOwner(state: ClubState, uid: string): void {
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
    await setDoc(
        doc(db, 'users', uid),
        {displayName: displayName.trim(), updatedAt: Date.now()},
        {merge: true},
    )
}

function userRef(uid: string) {
    return doc(db, 'users', uid)
}

function membershipRecord(info: {name: string; role: 'owner' | 'member'; joinedAt: number}) {
    return {
        name: info.name.trim() || 'Book club',
        role: info.role,
        joinedAt: info.joinedAt,
    }
}

async function writeUserClubMemberships(
    uid: string,
    memberships: Array<{code: string; name: string; role: 'owner' | 'member'; joinedAt: number}>,
): Promise<void> {
    if (memberships.length === 0) return
    const payload: Record<string, unknown> = {updatedAt: Date.now()}
    for (const row of memberships) {
        payload[`clubs.${row.code}`] = membershipRecord(row)
    }
    try {
        await updateDoc(userRef(uid), payload)
    } catch (err) {
        if (!isNotFound(err)) throw err
        const clubs: Record<string, ReturnType<typeof membershipRecord>> = {}
        for (const row of memberships) clubs[row.code] = membershipRecord(row)
        await setDoc(userRef(uid), {clubs, updatedAt: Date.now()}, {merge: true})
    }
}

/** Clubs cannot be listed in Firestore; membership is indexed on the user doc. */
export async function rememberClubMembership(
    uid: string,
    code: string,
    info: {name: string; role: 'owner' | 'member'; joinedAt: number},
): Promise<void> {
    await writeUserClubMemberships(uid, [{code, ...info}])
}

async function collectDiscoveredClubCodes(uid: string): Promise<string[]> {
    const found = new Set<string>()

    try {
        const owned = await getDocs(query(collection(db, 'clubs'), where('createdBy', '==', uid)))
        for (const row of owned.docs) found.add(row.id)
    } catch (err) {
        if (!isIgnorableQueryError(err)) throw err
    }

    try {
        const mine = await getDocs(query(collectionGroup(db, 'members'), where('uid', '==', uid)))
        for (const row of mine.docs) {
            const code = clubIdFromMemberPath(row.ref.path)
            if (code) found.add(code)
        }
    } catch (err) {
        if (!isIgnorableQueryError(err)) throw err
    }

    try {
        const members = await getDocs(
            query(collectionGroup(db, 'members'), where('role', 'in', ['owner', 'member'])),
        )
        for (const row of members.docs) {
            if (row.id !== uid) continue
            const code = clubIdFromMemberPath(row.ref.path)
            if (code) found.add(code)
        }
    } catch (err) {
        if (!isIgnorableQueryError(err)) throw err
    }

    return [...found]
}

export async function discoverAndRememberClubs(uid: string): Promise<void> {
    const codes = await collectDiscoveredClubCodes(uid)
    if (codes.length === 0) return

    const userSnap = await getDoc(userRef(uid))
    const known = new Set(parseUserClubs(userSnap.exists() ? dataOf(userSnap) : {}).map((row) => row.code))
    const pending = codes.filter((code) => !known.has(code))
    if (pending.length === 0) return

    const toWrite: Array<{code: string; name: string; role: 'owner' | 'member'; joinedAt: number}> = []
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
                await updateDoc(memberSnap.ref, {uid}).catch(() => undefined)
            }
        }),
    )
    await writeUserClubMemberships(uid, toWrite)
}

async function hydrateJoinedClubs(
    uid: string,
    memberships: ClubMembership[],
): Promise<JoinedClub[]> {
    if (memberships.length === 0) return []
    const rows = await Promise.all(
        memberships.map(async (membership) => {
            const cached: JoinedClub = {...membership, currentBook: null}
            try {
                const [clubSnap, memberSnap] = await Promise.all([
                    getDoc(clubRef(membership.code)),
                    getDoc(doc(clubRef(membership.code), 'members', uid)),
                ])
                if (clubSnap.exists() && memberSnap.exists()) {
                    const club = asClub(membership.code, dataOf(clubSnap))
                    const member = asMember(uid, dataOf(memberSnap))
                    return {
                        code: club.code,
                        name: club.name,
                        role: member.role,
                        joinedAt: member.joinedAt || membership.joinedAt,
                        currentBook: club.currentBook,
                    } satisfies JoinedClub
                }
                if (clubSnap.exists()) {
                    const club = asClub(membership.code, dataOf(clubSnap))
                    return {...cached, name: club.name, currentBook: club.currentBook}
                }
            } catch {
                return cached
            }
            return cached
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

    const emit = (memberships: ClubMembership[]) => {
        if (cancelled) return
        const myGeneration = ++generation
        void hydrateJoinedClubs(uid, memberships)
            .then((clubs) => {
                if (cancelled || myGeneration !== generation) return
                onData(clubs)
            })
            .catch((err) => {
                if (cancelled || myGeneration !== generation) return
                onError(err instanceof Error ? err : new Error(String(err)))
            })
    }

    const stop = onSnapshot(
        userRef(uid),
        (snap) => {
            latest = parseUserClubs(snap.exists() ? dataOf(snap) : {})
            if (discovered || latest.length > 0) emit(latest)
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
        batch.set(roundRef, {status: 'collecting', startedAt: now})
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
    existing: {displayName?: unknown} | null,
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
): Promise<void> {
    const name = displayName.trim()
    if (!name) throw new Error('Enter your name.')
    const ref = clubRef(code)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('No club with that code.')
    const data = snap.data()
    const memberRef = doc(ref, 'members', uid)
    const memberSnap = await getDoc(memberRef)
    const existingMember = memberSnap.exists() ? memberSnap.data() : null
    const write = memberWriteNeeded(existingMember, name)
    const role: 'owner' | 'member' =
        existingMember?.role === 'owner' || data.createdBy === uid ? 'owner' : 'member'
    const joinedAt =
        typeof existingMember?.joinedAt === 'number' ? existingMember.joinedAt : Date.now()
    if (write === 'rename') {
        await updateDoc(memberRef, {displayName: name, uid})
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
                await setDoc(roundRef, {status: 'collecting', startedAt: Date.now()})
            }
        }
    } else if (existingMember?.uid !== uid) {
        await updateDoc(memberRef, {uid})
    }
    const clubName = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Book club'
    await rememberClubMembership(uid, code, {name: clubName, role, joinedAt})
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
    let listenedRoundId: string | null = null
    let historyDocUnsub: Unsubscribe | null = null
    let listenedHistoryId: string | null = null

    const emit = () => {
        if (!club) return
        onData({club, members, rules, round, genreVotes, nominations, history})
    }

    const listenToRound = (roundId: string) => {
        if (listenedRoundId === roundId) return
        listenedRoundId = roundId
        for (const stop of roundUnsubs) stop()
        roundUnsubs = []
        const rRef = doc(clubRef(code), 'rounds', roundId)
        roundUnsubs.push(
            onSnapshot(
                rRef,
                (snap) => {
                    round = snap.exists() ? asRound(snap.id, dataOf(snap)) : null
                    emit()
                },
                (err) => onError(err),
            ),
            onSnapshot(
                collection(rRef, 'genreVotes'),
                (snap) => {
                    genreVotes = {}
                    for (const row of snap.docs) {
                        genreVotes[row.id] = parseGenreList(row.data().genres)
                    }
                    emit()
                },
                (err) => onError(err),
            ),
        )
    }

    const listenToCurrentHistory = (historyId: string | null) => {
        if (listenedHistoryId === historyId) return
        listenedHistoryId = historyId
        historyDocUnsub?.()
        historyDocUnsub = null
        if (!historyId) {
            history = []
            emit()
            return
        }
        historyDocUnsub = onSnapshot(
            doc(clubRef(code), 'history', historyId),
            (snap) => {
                history = snap.exists() ? [asHistory(snap.id, dataOf(snap))] : []
                emit()
            },
            (err) => onError(err),
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
                club = asClub(code, dataOf(snap))
                if (club.currentRoundId) listenToRound(club.currentRoundId)
                const currentOlid = club.currentBook?.olid
                listenToCurrentHistory(currentOlid ? historyDocId(currentOlid) : null)
                emit()
            },
            (err) => onError(err),
        ),
        onSnapshot(
            collection(clubRef(code), 'members'),
            (snap) => {
                members = snap.docs
                    .map((row) => asMember(row.id, dataOf(row)))
                    .sort((a, b) => a.joinedAt - b.joinedAt)
                emit()
            },
            (err) => onError(err),
        ),
        onSnapshot(
            collection(clubRef(code), 'rules'),
            (snap) => {
                rules = snap.docs
                    .map((row) => asRule(row.id, dataOf(row)))
                    .sort((a, b) => a.createdAt - b.createdAt)
                emit()
            },
            (err) => onError(err),
        ),
        onSnapshot(
            collection(clubRef(code), 'shortlist'),
            (snap) => {
                nominations = snap.docs
                    .map((row) => asNomination(row.id, dataOf(row)))
                    .sort((a, b) => a.createdAt - b.createdAt)
                emit()
            },
            (err) => onError(err),
        ),
    )

    return () => {
        for (const stop of unsubscribers) stop()
        for (const stop of roundUnsubs) stop()
        historyDocUnsub?.()
    }
}

export function subscribeClubHistory(
    code: string,
    onData: (history: HistoryBook[]) => void,
    onError: (error: Error) => void,
): Unsubscribe {
    return onSnapshot(
        collection(clubRef(code), 'history'),
        (snap) => {
            onData(
                snap.docs
                    .map((row) => asHistory(row.id, dataOf(row)))
                    .sort((a, b) => b.finishedAt - a.finishedAt),
            )
        },
        (err) => onError(err),
    )
}

export async function loadClubHistory(code: string): Promise<HistoryBook[]> {
    const snap = await getDocs(collection(clubRef(code), 'history'))
    return snap.docs
        .map((row) => asHistory(row.id, dataOf(row)))
        .sort((a, b) => b.finishedAt - a.finishedAt)
}

async function stateWithHistory(code: string, state: ClubState): Promise<ClubState> {
    return {...state, history: await loadClubHistory(code)}
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
    await pruneShortlist(code, full)
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

export async function pruneShortlist(code: string, state: ClubState): Promise<void> {
    const full = await stateWithHistory(code, state)
    const stale = staleShortlist(full)
    if (stale.length === 0) return
    const batch = writeBatch(db)
    for (const book of stale) {
        batch.delete(doc(clubRef(code), 'shortlist', book.id))
    }
    await batch.commit()
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
    await updateDoc(doc(clubRef(code), 'rounds', state.round.id), {status: 'concluding'})
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
    await pruneShortlist(code, full)
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
            dislikedRecs.push({olid: rec.olid, title: rec.title})
        }
    }

    const batch = writeBatch(db)
    if (book) {
        const listed = findMatchingClubBook(book, full.nominations)
        if (listed) batch.delete(doc(clubRef(code), 'shortlist', listed.id))
    }
    const roundRef = doc(collection(clubRef(code), 'rounds'))
    batch.set(roundRef, {status: 'collecting', startedAt: Date.now()})
    for (const [userId, genres] of Object.entries(full.genreVotes)) {
        if (genres.length > 0) {
            batch.set(doc(clubRef(code), 'rounds', roundRef.id, 'genreVotes', userId), {genres})
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

export function personalNotes(
    state: ClubState,
): Array<{uid: string; name: string; text: string}> {
    const notes = currentHistoryBook(state)?.notes ?? {}
    return state.members
        .map((member) => ({
            uid: member.id,
            name: member.displayName,
            text: (notes[member.id] ?? '').trim(),
        }))
        .filter((row) => row.text.length > 0)
}

function isNotFound(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error
        && String((error as {code: unknown}).code) === 'not-found'
}

async function upsertCurrentHistory(
    code: string,
    state: ClubState,
    uid: string,
    patch: {stars?: number; note?: string},
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
        const fields: Record<string, unknown> = {...base}
        if (patch.stars != null) fields[`ratings.${uid}`] = patch.stars
        if (patch.note != null) fields[`notes.${uid}`] = patch.note
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
                ? {...(row.ratings as Record<string, number>)}
                : {}
        const notes =
            row.notes && typeof row.notes === 'object' ? {...(row.notes as Record<string, string>)} : {}
        if (patch.stars != null) ratings[uid] = patch.stars
        if (patch.note != null) notes[uid] = patch.note
        const existingSubjects = Array.isArray(row.subjects) ? row.subjects.map(String) : []
        tx.set(historyRef, {
            ...base,
            finishedAt: row.finishedAt ?? Date.now(),
            ratings,
            notes,
            subjects: existingSubjects.length > 0 ? existingSubjects : subjects,
        })
    })
}

export async function rateCurrentBook(
    code: string,
    state: ClubState,
    uid: string,
    stars: number,
): Promise<void> {
    await upsertCurrentHistory(code, state, uid, {stars})
}

export async function savePersonalNote(
    code: string,
    state: ClubState,
    uid: string,
    note: string,
): Promise<void> {
    await upsertCurrentHistory(code, state, uid, {note: note.trim()})
}

export async function saveHistoryComment(
    code: string,
    historyId: string,
    uid: string,
    note: string,
): Promise<void> {
    await updateDoc(doc(clubRef(code), 'history', historyId), {
        [`notes.${uid}`]: note.trim(),
    })
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
        return genres.length > 0 ? [{userId: row.id, genres}] : []
    })
    if (pending.length === 0) return
    const batch = writeBatch(db)
    for (const {userId, genres} of pending) {
        batch.set(doc(clubRef(code), 'rounds', roundId, 'genreVotes', userId), {genres})
    }
    await batch.commit()
}
