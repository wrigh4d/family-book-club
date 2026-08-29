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

export function genreLean(
  votes: Record<string, Genre[]>,
): Array<{ genre: Genre; count: number }> {
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
      alreadyRead === 0
        ? 'nobody marked it as already read'
        : `${alreadyRead} already read it`

    return {
      ...nomination,
      score,
      why: `Picked because ${voteBit}, ${historyBit}, and ${readBit}.`,
    }
  })

  scored.sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
  return scored
}
