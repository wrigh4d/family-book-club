import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    runTransaction,
    setDoc,
    type Unsubscribe,
    updateDoc,
    writeBatch,
} from 'firebase/firestore'
import {asGenre, type AppRecommendation, type Club, type ClubState, type CurrentBook, type Genre, type HistoryBook, type Member, type Nomination, type Round, type Rule, type SuggestionSnapshot} from '../types'
import {asClub, asHistory, asMember, asNomination, asRound, asRule, parseGenreList} from './clubParse'
import {randomClubCode} from './codes'
import {db} from './firebase'
import {fetchWorkSubjects, isSameRecommendedBook} from './openLibrary'
import {computeMeetingRecs} from './recs'
import {scoreNominations} from './suggestion'

function clubRef(code: string) {
    return doc(db, 'clubs', code)
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
    }
}

export function currentHistoryId(state: ClubState): string | null {
    const book = resolveCurrentBook(state)
    if (!book?.olid) return null
    return `book-${book.olid.replaceAll('/', '_')}`
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
        try {
            await runTransaction(db, async (tx) => {
                const ref = clubRef(code)
                const existing = await tx.get(ref)
                if (existing.exists()) throw new Error('CODE_TAKEN')
                const now = Date.now()
                const roundRef = doc(collection(ref, 'rounds'))
                tx.set(ref, {
                    name: clubName,
                    code,
                    createdBy: uid,
                    currentRoundId: roundRef.id,
                    currentBookId: null,
                    currentBook: null,
                    createdAt: now,
                    dislikedRecs: [],
                })
                tx.set(doc(ref, 'members', uid), {
                    displayName: person,
                    role: 'owner',
                    joinedAt: now,
                })
                tx.set(roundRef, {status: 'collecting', startedAt: now})
            })
            return code
        } catch (err) {
            if (err instanceof Error && err.message === 'CODE_TAKEN') continue
            throw err
        }
    }
    throw new Error('Could not create a club code. Try again.')
}

export async function joinClub(
    code: string,
    uid: string,
    displayName: string,
): Promise<void> {
    const name = displayName.trim()
    if (!name) throw new Error('Enter your name.')
    const snap = await getDoc(clubRef(code))
    if (!snap.exists()) throw new Error('No club with that code.')
    const memberRef = doc(clubRef(code), 'members', uid)
    const memberSnap = await getDoc(memberRef)
    if (memberSnap.exists()) {
        await updateDoc(memberRef, {displayName: name})
        return
    }
    await setDoc(memberRef, {
        displayName: name,
        role: 'member',
        joinedAt: Date.now(),
    })
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

    const emit = () => {
        if (!club) return
        onData({club, members, rules, round, genreVotes, nominations, history})
    }

    const listenToRound = (roundId: string) => {
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
        onSnapshot(
            collection(clubRef(code), 'history'),
            (snap) => {
                history = snap.docs
                    .map((row) => asHistory(row.id, dataOf(row)))
                    .sort((a, b) => b.finishedAt - a.finishedAt)
                emit()
            },
            (err) => onError(err),
        ),
    )

    return () => {
        for (const stop of unsubscribers) stop()
        for (const stop of roundUnsubs) stop()
    }
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
): Promise<void> {
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
    },
): Promise<string> {
    const existing = (await getDocs(collection(clubRef(code), 'shortlist'))).docs.find(
        (row) => row.data().olid === book.olid,
    )
    if (existing) return existing.id
    const ref = await addDoc(collection(clubRef(code), 'shortlist'), {
        ...book,
        genre: asGenre(book.genre),
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
        genreRecommendation: genreRec ?? undefined,
        ratingsRecommendation:
            recs?.ratingsRecommendation ?? state.round?.ratingsRecommendation ?? undefined,
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
    await updateDoc(doc(clubRef(code), 'rounds', state.round.id), {status: 'concluding'})
}

function toCurrentBook(book: CurrentBook): CurrentBook {
    return {
        olid: book.olid || '',
        title: book.title,
        author: book.author || '',
        coverUrl: book.coverUrl ?? null,
        genre: asGenre(book.genre),
    }
}

export async function setStartingBook(
    code: string,
    state: ClubState,
    uid: string,
    book: CurrentBook,
): Promise<void> {
    assertOwner(state, uid)
    await updateDoc(clubRef(code), {
        currentBook: toCurrentBook(book),
        currentBookId: book.olid || null,
    })
}

export async function pickNextBook(
    code: string,
    state: ClubState,
    uid: string,
    book: CurrentBook | null,
): Promise<void> {
    assertOwner(state, uid)
    if (!state.round) throw new Error('No active round.')
    const shown = [
        state.round.genreRecommendation,
        state.round.ratingsRecommendation,
        state.round.suggestion?.genreRecommendation,
        state.round.suggestion?.ratingsRecommendation,
    ].filter((rec): rec is AppRecommendation => Boolean(rec?.olid))
    const ignored = shown.filter(
        (rec) => !state.nominations.some((item) => isSameRecommendedBook(rec, [item])),
    )
    const dislikedRecs = [...state.club.dislikedRecs]
    for (const rec of ignored) {
        if (!isSameRecommendedBook(rec, dislikedRecs)) {
            dislikedRecs.push({olid: rec.olid, title: rec.title})
        }
    }

    const batch = writeBatch(db)
    if (book?.olid) {
        const listed = state.nominations.find((row) => row.olid === book.olid)
        if (listed) batch.delete(doc(clubRef(code), 'shortlist', listed.id))
    }
    const roundRef = doc(collection(clubRef(code), 'rounds'))
    batch.set(roundRef, {status: 'collecting', startedAt: Date.now()})
    for (const [userId, genres] of Object.entries(state.genreVotes)) {
        if (genres.length > 0) {
            batch.set(doc(clubRef(code), 'rounds', roundRef.id, 'genreVotes', userId), {genres})
        }
    }
    batch.update(clubRef(code), {
        currentRoundId: roundRef.id,
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
            roundId,
            olid,
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl,
            genre: asGenre(book.genre),
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

async function loadPreviousRoundVotes(
    code: string,
    currentRoundId: string,
): Promise<Record<string, Genre[]>> {
    const roundsSnap = await getDocs(collection(clubRef(code), 'rounds'))
    const previous = roundsSnap.docs
        .map((row) => ({
            id: row.id,
            startedAt: Number(row.data().startedAt ?? 0),
        }))
        .filter((row) => row.id !== currentRoundId)
        .sort((a, b) => b.startedAt - a.startedAt)[0]
    if (!previous) return {}
    const votesSnap = await getDocs(
        collection(clubRef(code), 'rounds', previous.id, 'genreVotes'),
    )
    const votes: Record<string, Genre[]> = {}
    for (const row of votesSnap.docs) {
        votes[row.id] = parseGenreList(row.data().genres)
    }
    return votes
}

export async function seedGenreVotesFromPreviousRound(
    code: string,
    roundId: string,
): Promise<void> {
    const currentSnap = await getDocs(
        collection(clubRef(code), 'rounds', roundId, 'genreVotes'),
    )
    const already = new Set(
        currentSnap.docs
            .filter((row) => parseGenreList(row.data().genres).length > 0)
            .map((row) => row.id),
    )
    const previous = await loadPreviousRoundVotes(code, roundId)
    const pending = Object.entries(previous).filter(
        ([userId, genres]) => genres.length > 0 && !already.has(userId),
    )
    if (pending.length === 0) return
    const batch = writeBatch(db)
    for (const [userId, genres] of pending) {
        batch.set(doc(clubRef(code), 'rounds', roundId, 'genreVotes', userId), {genres})
    }
    await batch.commit()
}
