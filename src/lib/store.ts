import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    type DocumentData,
    getDoc,
    getDocs,
    onSnapshot,
    setDoc,
    type Unsubscribe,
    updateDoc,
} from 'firebase/firestore'
import {db} from './firebase'
import {randomClubCode} from './codes'
import {fetchWorkSubjects, isSameRecommendedBook} from './openLibrary'
import {computeMeetingRecs} from './recs'
import {scoreNominations} from './suggestion'
import type {
    AppRecommendation,
    Club,
    ClubState,
    CurrentBook,
    Genre,
    HistoryBook,
    Member,
    Nomination,
    Round,
    Rule,
    SuggestionSnapshot,
} from '../types'

function clubRef(code: string) {
    return doc(db, 'clubs', code)
}

function parseDislikedRecs(value: unknown): Club['dislikedRecs'] {
    if (!Array.isArray(value)) return []
    const recs: Club['dislikedRecs'] = []
    for (const row of value) {
        if (!row || typeof row !== 'object') continue
        const rec = row as { olid?: unknown; title?: unknown; userId?: unknown }
        if (!rec.olid || !rec.title) continue
        const item: Club['dislikedRecs'][number] = {
            olid: String(rec.olid),
            title: String(rec.title),
        }
        if (rec.userId) item.userId = String(rec.userId)
        recs.push(item)
    }
    return recs
}

function asClub(code: string, data: DocumentData): Club {
    return {
        name: String(data.name ?? 'Book club'),
        code,
        createdBy: String(data.createdBy ?? ''),
        currentRoundId: String(data.currentRoundId ?? ''),
        currentBookId: data.currentBookId ? String(data.currentBookId) : null,
        currentBook: parseCurrentBook(data.currentBook),
        createdAt: Number(data.createdAt ?? 0),
        dislikedRecs: parseDislikedRecs(data.dislikedRecs),
    }
}

function parseCurrentBook(value: unknown): CurrentBook | null {
    if (!value || typeof value !== 'object') return null
    const book = value as Record<string, unknown>
    if (!book.title) return null
    return {
        olid: String(book.olid ?? ''),
        title: String(book.title),
        author: String(book.author ?? ''),
        coverUrl: book.coverUrl ? String(book.coverUrl) : null,
        genre: String(book.genre ?? 'Literary'),
    }
}

function asMember(id: string, data: DocumentData): Member {
    return {
        id,
        displayName: String(data.displayName ?? 'Reader'),
        role: data.role === 'owner' ? 'owner' : 'member',
        joinedAt: Number(data.joinedAt ?? 0),
    }
}

function asRule(id: string, data: DocumentData): Rule {
    return {
        id,
        text: String(data.text ?? ''),
        createdBy: String(data.createdBy ?? ''),
        createdByName: String(data.createdByName ?? 'Someone'),
        createdAt: Number(data.createdAt ?? 0),
    }
}

function asNomination(id: string, data: DocumentData): Nomination {
    return {
        id,
        olid: String(data.olid ?? ''),
        title: String(data.title ?? 'Untitled'),
        author: String(data.author ?? 'Unknown'),
        coverUrl: data.coverUrl ? String(data.coverUrl) : null,
        genre: (data.genre as Nomination['genre']) || 'Literary',
        nominatedBy: String(data.nominatedBy ?? ''),
        nominatedByName: String(data.nominatedByName ?? 'Someone'),
        alreadyReadBy: Array.isArray(data.alreadyReadBy)
            ? data.alreadyReadBy.map(String)
            : [],
        createdAt: Number(data.createdAt ?? 0),
    }
}

function asRoundStatus(value: unknown): Round['status'] {
    if (value === 'presenting' || value === 'locked') return 'presenting'
    if (value === 'concluding') return 'concluding'
    return 'collecting'
}

function asRound(id: string, data: DocumentData): Round {
    const suggestion = data.suggestion as SuggestionSnapshot | undefined
    return {
        id,
        status: asRoundStatus(data.status),
        startedAt: Number(data.startedAt ?? 0),
        lockedAt: data.lockedAt ? Number(data.lockedAt) : undefined,
        selectedNominationId: data.selectedNominationId
            ? String(data.selectedNominationId)
            : undefined,
        suggestion,
        genreRecommendation:
            (data.genreRecommendation as AppRecommendation | null | undefined) ??
            suggestion?.genreRecommendation ??
            suggestion?.appRecommendation ??
            null,
        ratingsRecommendation:
            (data.ratingsRecommendation as AppRecommendation | null | undefined) ??
            suggestion?.ratingsRecommendation ??
            null,
    }
}

function asHistory(id: string, data: DocumentData): HistoryBook {
    return {
        id,
        roundId: String(data.roundId ?? ''),
        olid: String(data.olid ?? ''),
        title: String(data.title ?? ''),
        author: String(data.author ?? ''),
        coverUrl: data.coverUrl ? String(data.coverUrl) : null,
        genre: data.genre as HistoryBook['genre'],
        finishedAt: Number(data.finishedAt ?? 0),
        ratings:
            data.ratings && typeof data.ratings === 'object'
                ? Object.fromEntries(
                    Object.entries(data.ratings as Record<string, unknown>).map(
                        ([uid, stars]) => [uid, Number(stars)],
                    ),
                )
                : {},
        notes:
            data.notes && typeof data.notes === 'object'
                ? Object.fromEntries(
                    Object.entries(data.notes as Record<string, unknown>).map(([id, text]) => [
                        id,
                        String(text),
                    ]),
                )
                : {},
        subjects: Array.isArray(data.subjects) ? data.subjects.map(String) : [],
    }
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

export function wrapUpStatus(state: ClubState): {
    historyId: string | null
    book: HistoryBook | null
    missingRaters: ClubState['members']
    hasNote: boolean
    ready: boolean
} {
    const historyId = currentHistoryId(state)
    const book = historyId
        ? (state.history.find((row) => row.id === historyId) ?? null)
        : null
    const missingRaters = state.members.filter((member) => book?.ratings[member.id] == null)
    const hasNote = Object.values(book?.notes ?? {}).some((text) => text.trim())
    return {
        historyId,
        book,
        missingRaters,
        hasNote,
        ready: Boolean(historyId) && missingRaters.length === 0 && hasNote,
    }
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

    for (let attempt = 0; attempt < 6; attempt += 1) {
        const code = randomClubCode()
        const existing = await getDoc(clubRef(code))
        if (existing.exists()) continue

        const now = Date.now()
        const roundRef = doc(collection(clubRef(code), 'rounds'))
        await setDoc(clubRef(code), {
            name: clubName,
            code,
            createdBy: uid,
            currentRoundId: roundRef.id,
            currentBookId: null,
            currentBook: null,
            createdAt: now,
            dislikedRecs: [],
        })
        await setDoc(doc(clubRef(code), 'members', uid), {
            displayName,
            role: 'owner',
            joinedAt: now,
        })
        await setDoc(roundRef, {status: 'collecting', startedAt: now})
        return code
    }
    throw new Error('Could not create a club code. Try again.')
}

export async function joinClub(
    code: string,
    uid: string,
    displayName: string,
): Promise<void> {
    const snap = await getDoc(clubRef(code))
    if (!snap.exists()) throw new Error('No club with that code.')
    const memberSnap = await getDoc(doc(clubRef(code), 'members', uid))
    if (memberSnap.exists()) {
        await updateDoc(doc(clubRef(code), 'members', uid), {displayName})
        return
    }
    await setDoc(doc(clubRef(code), 'members', uid), {
        displayName,
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
    const recVotes: ClubState['recVotes'] = {}
    let roundUnsubs: Unsubscribe[] = []

    const emit = () => {
        if (!club) return
        onData({club, members, rules, round, genreVotes, nominations, history, recVotes})
    }

    const listenToRound = (roundId: string) => {
        for (const stop of roundUnsubs) stop()
        roundUnsubs = []
        const rRef = doc(clubRef(code), 'rounds', roundId)
        roundUnsubs.push(
            onSnapshot(
                rRef,
                (snap) => {
                    round = snap.exists() ? asRound(snap.id, snap.data()) : null
                    emit()
                },
                (err) => onError(err),
            ),
            onSnapshot(
                collection(rRef, 'genreVotes'),
                (snap) => {
                    genreVotes = {}
                    for (const row of snap.docs) {
                        const genres = row.data().genres
                        genreVotes[row.id] = Array.isArray(genres) ? (genres as Genre[]) : []
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
                club = asClub(code, snap.data())
                if (club.currentRoundId) listenToRound(club.currentRoundId)
                emit()
            },
            (err) => onError(err),
        ),
        onSnapshot(
            collection(clubRef(code), 'members'),
            (snap) => {
                members = snap.docs
                    .map((row) => asMember(row.id, row.data()))
                    .sort((a, b) => a.joinedAt - b.joinedAt)
                emit()
            },
            (err) => onError(err),
        ),
        onSnapshot(
            collection(clubRef(code), 'rules'),
            (snap) => {
                rules = snap.docs
                    .map((row) => asRule(row.id, row.data()))
                    .sort((a, b) => a.createdAt - b.createdAt)
                emit()
            },
            (err) => onError(err),
        ),
        onSnapshot(
            collection(clubRef(code), 'shortlist'),
            (snap) => {
                nominations = snap.docs
                    .map((row) => asNomination(row.id, row.data()))
                    .sort((a, b) => a.createdAt - b.createdAt)
                emit()
            },
            (err) => onError(err),
        ),
        onSnapshot(
            collection(clubRef(code), 'history'),
            (snap) => {
                history = snap.docs
                    .map((row) => asHistory(row.id, row.data()))
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
        text: trimmed,
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
    await setDoc(doc(clubRef(code), 'rounds', roundId, 'genreVotes', uid), {genres})
}

export async function migrateRoundNominationsToShortlist(
    code: string,
    roundId: string,
): Promise<void> {
    const shortSnap = await getDocs(collection(clubRef(code), 'shortlist'))
    if (!shortSnap.empty) return
    const oldSnap = await getDocs(collection(clubRef(code), 'rounds', roundId, 'nominations'))
    await Promise.all(
        oldSnap.docs.map((row) => setDoc(doc(clubRef(code), 'shortlist', row.id), row.data())),
    )
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
        appRecommendation: genreRec ?? undefined,
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
        genre: book.genre || 'Literary',
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
    if (book?.olid) {
        const listed = state.nominations.find((row) => row.olid === book.olid)
        if (listed) await deleteDoc(doc(clubRef(code), 'shortlist', listed.id))
    }
    const roundRef = doc(collection(clubRef(code), 'rounds'))
    await setDoc(roundRef, {status: 'collecting', startedAt: Date.now()})
    await copyGenreVotes(code, roundRef.id, state.genreVotes)
    await updateDoc(clubRef(code), {
        currentRoundId: roundRef.id,
        currentBookId: book?.olid ?? null,
        currentBook: book ? toCurrentBook(book) : null,
        dislikedRecs,
    })
}

export function personalNotes(
    state: ClubState,
): Array<{ uid: string; name: string; text: string }> {
    const notes = wrapUpStatus(state).book?.notes ?? {}
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
    patch: { ratings?: Record<string, number>; notes?: Record<string, string> },
): Promise<void> {
    const book = resolveCurrentBook(state)
    const historyId = currentHistoryId(state)
    if (!book || !historyId || !state.round) throw new Error('No current book.')
    const historyRef = doc(clubRef(code), 'history', historyId)
    const existing = state.history.find((row) => row.id === historyId)
    const olid = book.olid ?? existing?.olid ?? ''
    let subjects = existing?.subjects ?? []
    if (olid && subjects.length === 0) {
        subjects = await fetchWorkSubjects(olid)
        if (subjects.length === 0) subjects = [book.genre]
    }
    await setDoc(
        historyRef,
        {
            roundId: state.round.id,
            olid,
            title: book.title,
            author: book.author,
            coverUrl: book.coverUrl,
            genre: book.genre,
            finishedAt: existing?.finishedAt ?? Date.now(),
            ratings: patch.ratings ?? existing?.ratings ?? {},
            notes: patch.notes ?? existing?.notes ?? {},
            subjects,
        },
        {merge: true},
    )
}

export async function rateCurrentBook(
    code: string,
    state: ClubState,
    uid: string,
    stars: number,
): Promise<void> {
    const existing = wrapUpStatus(state).book
    await upsertCurrentHistory(code, state, {
        ratings: {...(existing?.ratings ?? {}), [uid]: stars},
    })
}

export async function savePersonalNote(
    code: string,
    state: ClubState,
    uid: string,
    note: string,
): Promise<void> {
    const existing = wrapUpStatus(state).book
    await upsertCurrentHistory(code, state, {
        ratings: existing?.ratings ?? {},
        notes: {...(existing?.notes ?? {}), [uid]: note.trim()},
    })
}


async function copyGenreVotes(
    code: string,
    roundId: string,
    votes: Record<string, Genre[]>,
): Promise<void> {
    const writes = Object.entries(votes)
        .filter(([, genres]) => genres.length > 0)
        .map(([userId, genres]) =>
            setDoc(doc(clubRef(code), 'rounds', roundId, 'genreVotes', userId), {genres}),
        )
    await Promise.all(writes)
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
        const genres = row.data().genres
        votes[row.id] = Array.isArray(genres) ? (genres as Genre[]) : []
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
            .filter((row) => Array.isArray(row.data().genres) && row.data().genres.length > 0)
            .map((row) => row.id),
    )
    const previous = await loadPreviousRoundVotes(code, roundId)
    const writes = Object.entries(previous)
        .filter(([userId, genres]) => genres.length > 0 && !already.has(userId))
        .map(([userId, genres]) =>
            setDoc(doc(clubRef(code), 'rounds', roundId, 'genreVotes', userId), {genres}),
        )
    await Promise.all(writes)
}
