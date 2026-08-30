import {asGenre, isGenre, type AppRecommendation, type Club, type CurrentBook, type Genre, type HistoryBook, type Member, type Nomination, type RecSource, type Round, type Rule, type SuggestionSnapshot} from '../types'

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

function asPositiveInt(value: unknown): number | null {
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.round(n)
}

export function parseDislikedRecs(value: unknown): Club['dislikedRecs'] {
    if (!Array.isArray(value)) return []
    const recs: Club['dislikedRecs'] = []
    for (const row of value) {
        if (!row || typeof row !== 'object') continue
        const rec = row as {olid?: unknown; title?: unknown; userId?: unknown}
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

export function parseCurrentBook(value: unknown): CurrentBook | null {
    if (!value || typeof value !== 'object') return null
    const book = value as Record<string, unknown>
    if (!book.title) return null
    return {
        olid: asString(book.olid),
        title: String(book.title),
        author: asString(book.author),
        coverUrl: book.coverUrl ? String(book.coverUrl) : null,
        genre: asGenre(book.genre),
        firstPublishYear: asPositiveInt(book.firstPublishYear),
        pageCount: asPositiveInt(book.pageCount),
    }
}

export function parseAppRec(value: unknown): AppRecommendation | null {
    if (!value || typeof value !== 'object') return null
    const rec = value as Record<string, unknown>
    if (!rec.olid || !rec.title) return null
    const source: RecSource = rec.source === 'ratings' ? 'ratings' : 'genre'
    return {
        olid: String(rec.olid),
        title: String(rec.title),
        author: asString(rec.author),
        coverUrl: rec.coverUrl ? String(rec.coverUrl) : null,
        genre: asString(rec.genre, 'Literary'),
        why: asString(rec.why),
        source,
        firstPublishYear: asPositiveInt(rec.firstPublishYear),
        pageCount: asPositiveInt(rec.pageCount),
    }
}

export function parseGenreList(value: unknown): Genre[] {
    if (!Array.isArray(value)) return []
    const out: Genre[] = []
    for (const item of value) {
        if (isGenre(item) && !out.includes(item)) out.push(item)
    }
    return out
}

export function asClub(code: string, data: Record<string, unknown>): Club {
    return {
        name: asString(data.name, 'Book club'),
        code,
        createdBy: asString(data.createdBy),
        currentRoundId: asString(data.currentRoundId),
        previousRoundId: data.previousRoundId ? String(data.previousRoundId) : null,
        currentBookId: data.currentBookId ? String(data.currentBookId) : null,
        currentBook: parseCurrentBook(data.currentBook),
        createdAt: asNumber(data.createdAt),
        dislikedRecs: parseDislikedRecs(data.dislikedRecs),
    }
}

export function asMember(id: string, data: Record<string, unknown>): Member {
    return {
        id,
        displayName: asString(data.displayName, 'Reader'),
        role: data.role === 'owner' ? 'owner' : 'member',
        joinedAt: asNumber(data.joinedAt),
    }
}

export function asRule(id: string, data: Record<string, unknown>): Rule {
    return {
        id,
        text: asString(data.text),
        createdBy: asString(data.createdBy),
        createdByName: asString(data.createdByName, 'Someone'),
        createdAt: asNumber(data.createdAt),
    }
}

export function asNomination(id: string, data: Record<string, unknown>): Nomination {
    return {
        id,
        olid: asString(data.olid),
        title: asString(data.title, 'Untitled'),
        author: asString(data.author, 'Unknown'),
        coverUrl: data.coverUrl ? String(data.coverUrl) : null,
        genre: asGenre(data.genre),
        firstPublishYear: asPositiveInt(data.firstPublishYear),
        pageCount: asPositiveInt(data.pageCount),
        nominatedBy: asString(data.nominatedBy),
        nominatedByName: asString(data.nominatedByName, 'Someone'),
        alreadyReadBy: Array.isArray(data.alreadyReadBy) ? data.alreadyReadBy.map(String) : [],
        createdAt: asNumber(data.createdAt),
    }
}

export function asRoundStatus(value: unknown): Round['status'] {
    if (value === 'presenting' || value === 'locked') return 'presenting'
    if (value === 'concluding') return 'concluding'
    return 'collecting'
}

function parseSuggestion(value: unknown): SuggestionSnapshot | undefined {
    if (!value || typeof value !== 'object') return undefined
    const data = value as Record<string, unknown>
    const shortlist = Array.isArray(data.shortlist)
        ? data.shortlist.flatMap((row) => {
              if (!row || typeof row !== 'object') return []
              const book = row as Record<string, unknown>
              if (!book.id || !book.title) return []
              return [
                  {
                      id: String(book.id),
                      title: String(book.title),
                      author: asString(book.author),
                      coverUrl: book.coverUrl ? String(book.coverUrl) : null,
                  },
              ]
          })
        : []
    return {
        nominationId: asString(data.nominationId),
        title: asString(data.title, 'Meeting'),
        author: asString(data.author),
        coverUrl: data.coverUrl ? String(data.coverUrl) : null,
        genre: asGenre(data.genre),
        why: asString(data.why),
        shortlist,
        appRecommendation: parseAppRec(data.appRecommendation) ?? undefined,
        genreRecommendation: parseAppRec(data.genreRecommendation) ?? undefined,
        ratingsRecommendation: parseAppRec(data.ratingsRecommendation) ?? undefined,
    }
}

export function asRound(id: string, data: Record<string, unknown>): Round {
    const suggestion = parseSuggestion(data.suggestion)
    return {
        id,
        status: asRoundStatus(data.status),
        startedAt: asNumber(data.startedAt),
        lockedAt: data.lockedAt ? asNumber(data.lockedAt) : undefined,
        selectedNominationId: data.selectedNominationId ? String(data.selectedNominationId) : undefined,
        suggestion,
        genreRecommendation:
            parseAppRec(data.genreRecommendation) ??
            suggestion?.genreRecommendation ??
            suggestion?.appRecommendation ??
            null,
        ratingsRecommendation:
            parseAppRec(data.ratingsRecommendation) ?? suggestion?.ratingsRecommendation ?? null,
    }
}

function asRatingMap(value: unknown): Record<string, number> {
    if (!value || typeof value !== 'object') return {}
    const out: Record<string, number> = {}
    for (const [uid, stars] of Object.entries(value as Record<string, unknown>)) {
        const n = Number(stars)
        if (!Number.isFinite(n) || n < 1 || n > 5) continue
        out[uid] = n
    }
    return out
}

function asNoteMap(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object') return {}
    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([id, text]) => [id, String(text)]),
    )
}

export function asHistory(id: string, data: Record<string, unknown>): HistoryBook {
    return {
        id,
        roundId: asString(data.roundId),
        olid: asString(data.olid),
        title: asString(data.title),
        author: asString(data.author),
        coverUrl: data.coverUrl ? String(data.coverUrl) : null,
        genre: asGenre(data.genre),
        finishedAt: asNumber(data.finishedAt),
        ratings: asRatingMap(data.ratings),
        notes: asNoteMap(data.notes),
        subjects: Array.isArray(data.subjects) ? data.subjects.map(String) : [],
    }
}
