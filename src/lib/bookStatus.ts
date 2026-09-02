import type { ClubState, HistoryBook, Nomination } from '../types'

export type ClubBookStatus = 'current' | 'history' | 'shortlist' | null

type BookRef = { olid: string; title: string }

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function isSameClubBook(a: BookRef, b: BookRef): boolean {
  if (a.olid && b.olid) return a.olid === b.olid
  return Boolean(a.title && b.title && normalizeTitle(a.title) === normalizeTitle(b.title))
}

export function findMatchingClubBook<T extends BookRef>(
  book: BookRef,
  catalog: T[],
): T | undefined {
  return catalog.find((row) => isSameClubBook(book, row))
}

function currentRef(state: ClubState): BookRef | null {
  if (state.club.currentBook) return state.club.currentBook
  const id = state.club.currentBookId ?? state.round?.selectedNominationId
  const nom = state.nominations.find((row) => row.id === id)
  return nom ?? null
}

export function clubBookStatus(state: ClubState, book: BookRef): ClubBookStatus {
  const current = currentRef(state)
  if (current && isSameClubBook(book, current)) return 'current'
  if (findMatchingClubBook(book, state.history)) return 'history'
  if (findMatchingClubBook(book, state.nominations)) return 'shortlist'
  return null
}

export function clubBookStatusLabel(status: ClubBookStatus): string | null {
  if (status === 'current') return 'Current book'
  if (status === 'history') return 'Already read'
  return null
}

export function assertCanBeNextBook(state: ClubState, book: BookRef): void {
  const status = clubBookStatus(state, book)
  if (status === 'current') throw new Error('That book is already the current book.')
  if (status === 'history') throw new Error('The club already read that book.')
}

export function assertCanJoinShortlist(state: ClubState, book: BookRef): void {
  assertCanBeNextBook(state, book)
}

export function availableShortlist(state: ClubState): Nomination[] {
  return state.nominations.filter((book) => clubBookStatus(state, book) === 'shortlist')
}

export function staleShortlist(state: ClubState): Nomination[] {
  return state.nominations.filter((book) => {
    const status = clubBookStatus(state, book)
    return status === 'current' || status === 'history'
  })
}

export function historyDocId(olid: string): string {
  return `book-${olid.replaceAll('/', '_')}`
}

export function unfinishedHistoryForCurrent(state: ClubState): HistoryBook[] {
  const current = currentRef(state)
  if (!current) return []
  return state.history.filter((row) => isSameClubBook(row, current))
}

export function pastHistoryBooks(state: ClubState): HistoryBook[] {
  const current = currentRef(state)
  return state.history.filter((row) => !current || !isSameClubBook(row, current))
}

export function groupRating(
  ratings: Record<string, number>,
): { average: number; count: number } | null {
  const values = Object.values(ratings).filter((n) => Number.isFinite(n) && n >= 1 && n <= 5)
  if (values.length === 0) return null
  return {
    average: values.reduce((a, b) => a + b, 0) / values.length,
    count: values.length,
  }
}

export function groupRatingLabel(ratings: Record<string, number>): string {
  const group = groupRating(ratings)
  if (!group) return 'No ratings yet'
  const n = group.count
  return `${group.average.toFixed(1)}/5 · ${n} ${n === 1 ? 'rating' : 'ratings'}`
}
