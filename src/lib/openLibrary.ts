import type {Genre} from '../types'

export type BookSearchHit = {
    olid: string
    title: string
    author: string
    coverUrl: string | null
    genre: Genre
}

const SUBJECT_BY_GENRE: Record<Genre, string> = {
    Fantasy: 'fantasy',
    'Science Fiction': 'science_fiction',
    Mystery: 'mystery',
    Thriller: 'thriller',
    Horror: 'horror',
    Romance: 'romance',
    Historical: 'historical_fiction',
    Literary: 'fiction',
    'Young Adult': 'young_adult',
    'Non-fiction': 'nonfiction',
    Biography: 'biography',
    Memoir: 'autobiography',
}

function coverUrlFromId(coverId: number | undefined): string | null {
    return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null
}

type OpenLibraryDoc = {
    key?: string
    title?: string
    author_name?: string[]
    cover_i?: number
    subject?: string[]
}

const GENRE_NEEDLES: Array<{ genre: Genre; needles: string[] }> = [
    {genre: 'Young Adult', needles: ['young adult', 'ya fiction', 'juvenile fiction']},
    {genre: 'Science Fiction', needles: ['science fiction', 'sci-fi', 'scifi']},
    {genre: 'Historical', needles: ['historical fiction', 'historical']},
    {genre: 'Biography', needles: ['biography']},
    {genre: 'Memoir', needles: ['memoir', 'autobiography']},
    {genre: 'Non-fiction', needles: ['nonfiction', 'non-fiction', 'non fiction']},
    {genre: 'Horror', needles: ['horror']},
    {genre: 'Thriller', needles: ['thriller', 'suspense']},
    {genre: 'Mystery', needles: ['mystery', 'detective']},
    {genre: 'Romance', needles: ['romance']},
    {genre: 'Fantasy', needles: ['fantasy']},
    {genre: 'Literary', needles: ['literary', 'fiction']},
]

export function genreFromSubjects(subjects: string[] | undefined): Genre {
    const hay = (subjects ?? []).map((tag) => tag.toLowerCase().replaceAll('_', ' '))
    for (const {genre, needles} of GENRE_NEEDLES) {
        if (hay.some((tag) => needles.some((needle) => tag.includes(needle)))) return genre
    }
    return 'Literary'
}

type OpenLibrarySearch = {
    docs?: OpenLibraryDoc[]
}

function hitsFromDocs(docs: OpenLibraryDoc[] | undefined): BookSearchHit[] {
    return (docs ?? [])
        .filter((doc) => doc.title && doc.key)
        .map((doc) => ({
            olid: doc.key as string,
            title: doc.title as string,
            author: doc.author_name?.[0] ?? 'Unknown author',
            coverUrl: coverUrlFromId(doc.cover_i),
            genre: genreFromSubjects(doc.subject),
        }))
}

async function fetchJson<T>(url: string, errorMessage: string): Promise<T> {
    const res = await fetch(url, {signal: AbortSignal.timeout(12_000)})
    if (!res.ok) throw new Error(errorMessage)
    return (await res.json()) as T
}

export async function searchBooks(query: string): Promise<BookSearchHit[]> {
    const q = query.trim()
    if (q.length < 2) return []

    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=key,title,author_name,cover_i,subject`
    const data = await fetchJson<OpenLibrarySearch>(url, 'Could not search Open Library.')
    return hitsFromDocs(data.docs)
}

export async function popularBooksOverall(): Promise<BookSearchHit[]> {
    const url =
        'https://openlibrary.org/search.json?q=language:eng&sort=want_to_read&limit=8&fields=key,title,author_name,cover_i,subject'
    const data = await fetchJson<OpenLibrarySearch>(url, 'Could not load popular books.')
    return hitsFromDocs(data.docs)
}

type SubjectWork = {
    key?: string
    title?: string
    authors?: Array<{ name?: string }>
    cover_id?: number
}

type SubjectResponse = {
    works?: SubjectWork[]
}

function normalizeTitle(title: string): string {
    return title.toLowerCase().replaceAll(/[^a-z0-9]+/g, ' ').trim()
}

function titleTokens(title: string): string[] {
    const skip = new Set(['with', 'from', 'that', 'this', 'have', 'were', 'their'])
    return normalizeTitle(title)
        .split(' ')
        .filter((word) => word.length > 3 && !skip.has(word))
}

export function isSameRecommendedBook(
    hit: { olid: string; title: string },
    disliked: Array<{ olid: string; title: string }>,
): boolean {
    const hitTitle = normalizeTitle(hit.title)
    const hitTokens = titleTokens(hit.title)
    return disliked.some((row) => {
        if (row.olid && hit.olid && row.olid === hit.olid) return true
        const other = normalizeTitle(row.title)
        if (other && other === hitTitle) return true
        const otherTokens = titleTokens(row.title)
        if (!hitTokens.length || !otherTokens.length) return false
        const overlap = hitTokens.filter((word) => otherTokens.includes(word)).length
        return overlap >= Math.min(2, hitTokens.length, otherTokens.length)
    })
}

function firstUnused(
    hits: BookSearchHit[],
    excludedOlids: Set<string>,
    disliked: Array<{ olid: string; title: string }> = [],
): BookSearchHit | null {
    return (
        hits.find((hit) => {
            if (!hit.olid) return false
            if (excludedOlids.has(hit.olid)) return false
            return !isSameRecommendedBook(hit, disliked)
        }) ?? null
    )
}

export async function popularBookInGenre(
    genre: Genre,
    excludeOlids: string[],
    disliked: Array<{ olid: string; title: string }> = [],
): Promise<BookSearchHit | null> {
    const subject = SUBJECT_BY_GENRE[genre]
    const excluded = new Set(excludeOlids)

    try {
        const url = `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json?limit=40`
        const data = await fetchJson<SubjectResponse>(url, 'Could not load a genre recommendation.')
        const hits = (data.works ?? [])
            .filter((work) => work.title && work.key)
            .map((work) => ({
                olid: work.key as string,
                title: work.title as string,
                author: work.authors?.[0]?.name ?? 'Unknown author',
                coverUrl: coverUrlFromId(work.cover_id),
                genre,
            }))
        const match = firstUnused(hits, excluded, disliked)
        if (match) return match
    } catch {
        // Fall through to search.json
    }

    const data = await fetchJson<OpenLibrarySearch>(
        `https://openlibrary.org/search.json?subject=${encodeURIComponent(subject)}&limit=40`,
        'Could not load a genre recommendation.',
    )
    const hits = (data.docs ?? [])
        .filter((doc) => doc.title && doc.key)
        .map((doc) => ({
            olid: doc.key as string,
            title: doc.title as string,
            author: doc.author_name?.[0] ?? 'Unknown author',
            coverUrl: coverUrlFromId(doc.cover_i),
            genre: genreFromSubjects(doc.subject) === 'Literary' ? genre : genreFromSubjects(doc.subject),
        }))
    return firstUnused(hits, excluded, disliked)
}

type WorkResponse = {
    subjects?: string[]
    subject_places?: string[]
}

export async function fetchWorkSubjects(olid: string): Promise<string[]> {
    const key = olid.startsWith('/works/') ? olid : `/works/${olid}`
    try {
        const data = await fetchJson<WorkResponse>(
            `https://openlibrary.org${key}.json`,
            'Could not load work subjects.',
        )
        return (data.subjects ?? []).map((tag) => tag.trim()).filter(Boolean)
    } catch {
        return []
    }
}

function subjectQuery(tag: string): string {
    const cleaned = tag.trim().toLowerCase().replaceAll(/"/g, '')
    return `subject:"${cleaned}"`
}

export async function bookMatchingTags(
    loved: string[],
    avoided: string[],
    excludeOlids: string[],
    disliked: Array<{ olid: string; title: string }> = [],
): Promise<BookSearchHit | null> {
    const include = loved.slice(0, 3).map(subjectQuery)
    if (!include.length) return null
    const exclude = avoided.slice(0, 4).map((tag) => `NOT ${subjectQuery(tag)}`)
    const q = `(${include.join(' OR ')}) ${exclude.join(' ')}`.trim()
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&sort=rating&limit=24&fields=key,title,author_name,cover_i,subject`
    const data = await fetchJson<OpenLibrarySearch>(
        url,
        'Could not load a ratings-based recommendation.',
    )
    return firstUnused(hitsFromDocs(data.docs), new Set(excludeOlids), disliked)
}
