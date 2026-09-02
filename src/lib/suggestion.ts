import type { Genre, HistoryBook, Nomination, ScoredNomination } from '../types'

function genreMemory(
  genre: Genre,
  history: HistoryBook[],
): { multiplier: number; average: number | null } {
  const avgs: number[] = []
  for (const book of history) {
    if (book.genre !== genre) continue
    const ratings = Object.values(book.ratings)
    if (ratings.length === 0) continue
    avgs.push(ratings.reduce((sum, n) => sum + n, 0) / ratings.length)
  }
  if (avgs.length === 0) return { multiplier: 1, average: null }
  const average = avgs.reduce((sum, n) => sum + n, 0) / avgs.length
  // Map 1..5 onto 0.7..1.3 so history steers, never bans.
  const multiplier = 0.7 + ((average - 1) / 4) * 0.6
  return { multiplier, average }
}

export function topWantedGenre(
  votes: Record<string, Genre[]>,
): { genre: Genre; count: number; voterCount: number } | null {
  const lean = genreLean(votes)
  const top = lean[0]
  if (!top) return null
  return {
    ...top,
    voterCount: Math.max(Object.keys(votes).length, 1),
  }
}

export function appRecommendationWhy(genre: Genre, voteCount: number, voterCount: number): string {
  return `A popular ${genre} title that is not on your shortlist. ${voteCount} of ${voterCount} want ${genre} this round.`
}

export type TagTaste = {
  tag: string
  average: number
  bookCount: number
}

export const LOVED_TAG_MIN = 4
export const AVOIDED_TAG_MAX = 2.5

function bookAverage(book: HistoryBook): number | null {
  const ratings = Object.values(book.ratings)
  if (ratings.length === 0) return null
  return ratings.reduce((sum, n) => sum + n, 0) / ratings.length
}

export function tagsForHistoryBook(book: HistoryBook): string[] {
  const fromOl = (book.subjects ?? []).map((tag) => tag.trim()).filter(Boolean)
  if (fromOl.length) return fromOl
  return [book.genre]
}

export function tagTasteFromHistory(history: HistoryBook[]): TagTaste[] {
  const buckets = new Map<string, { sum: number; n: number }>()
  for (const book of history) {
    const avg = bookAverage(book)
    if (avg == null) continue
    for (const tag of tagsForHistoryBook(book)) {
      const key = tag.toLocaleLowerCase()
      const bucket = buckets.get(key) ?? { sum: 0, n: 0 }
      bucket.sum += avg
      bucket.n += 1
      buckets.set(key, bucket)
    }
  }
  return [...buckets.entries()]
    .map(([tag, bucket]) => ({
      tag,
      average: bucket.sum / bucket.n,
      bookCount: bucket.n,
    }))
    .sort((a, b) => b.average - a.average || b.bookCount - a.bookCount)
}

export function splitTagTaste(taste: TagTaste[]): {
  loved: TagTaste[]
  avoided: TagTaste[]
} {
  return {
    loved: taste.filter((row) => row.average >= LOVED_TAG_MIN),
    avoided: taste.filter((row) => row.average <= AVOIDED_TAG_MAX),
  }
}

export function ratingsRecommendationWhy(loved: TagTaste[], avoided: TagTaste[]): string {
  const lovedBit = loved
    .slice(0, 3)
    .map((row) => `${row.tag} (${row.average.toFixed(1)}/5)`)
    .join(', ')
  const avoidedBit = avoided
    .slice(0, 3)
    .map((row) => `${row.tag} (${row.average.toFixed(1)}/5)`)
    .join(', ')
  if (lovedBit && avoidedBit) {
    return `Based on past club ratings: lean into ${lovedBit}, and shy away from ${avoidedBit}.`
  }
  if (lovedBit) return `Based on past club ratings: lean into ${lovedBit}.`
  return 'Rate a finished book to teach the app which tags the club likes.'
}

export function genreLean(votes: Record<string, Genre[]>): Array<{ genre: Genre; count: number }> {
  const counts = new Map<Genre, number>()
  for (const genres of Object.values(votes)) {
    for (const genre of genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
}

export function scoreNominations(
  nominations: Nomination[],
  votes: Record<string, Genre[]>,
  history: HistoryBook[],
): ScoredNomination[] {
  const voterCount = Math.max(Object.keys(votes).length, 1)
  const lean = genreLean(votes)
  const demand = new Map(lean.map((row) => [row.genre, row.count]))

  const scored = nominations.map((nomination) => {
    const voteCount = demand.get(nomination.genre) ?? 0
    const demandWeight = voteCount / voterCount
    const memory = genreMemory(nomination.genre, history)
    const alreadyRead = nomination.alreadyReadBy.length
    const score = demandWeight * memory.multiplier - 0.15 * alreadyRead

    const voteBit =
      voteCount === 0
        ? `nobody voted ${nomination.genre} this round`
        : `${voteCount} of ${voterCount} voted ${nomination.genre}`
    const historyBit =
      memory.average == null
        ? `no past ${nomination.genre.toLowerCase()} ratings yet`
        : `the group rated past ${nomination.genre.toLowerCase()} ${memory.average.toFixed(1)}/5`
    const readBit =
      alreadyRead === 0 ? 'nobody marked it as already read' : `${alreadyRead} already read it`

    return {
      ...nomination,
      score,
      why: `Picked because ${voteBit}, ${historyBit}, and ${readBit}.`,
    }
  })

  scored.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
  return scored
}
