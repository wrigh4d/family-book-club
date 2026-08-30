export const GENRES = [
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Thriller',
  'Horror',
  'Romance',
  'Historical',
  'Literary',
  'Young Adult',
  'Non-fiction',
  'Biography',
  'Memoir',
] as const

export type Genre = (typeof GENRES)[number]

export type RoundStatus = 'collecting' | 'presenting' | 'concluding'

export type CurrentBook = {
  olid: string
  title: string
  author: string
  coverUrl: string | null
  genre: string
}

export type Member = {
  id: string
  displayName: string
  role: 'owner' | 'member'
  joinedAt: number
}

export type Rule = {
  id: string
  text: string
  createdBy: string
  createdByName: string
  createdAt: number
}

export type Nomination = {
  id: string
  olid: string
  title: string
  author: string
  coverUrl: string | null
  genre: Genre
  nominatedBy: string
  nominatedByName: string
  alreadyReadBy: string[]
  createdAt: number
}

export type RecVote = 'up' | 'down'

export type RecSource = 'genre' | 'ratings'

export type AppRecommendation = {
  olid: string
  title: string
  author: string
  coverUrl: string | null
  genre: string
  why: string
  source: RecSource
}

export type Round = {
  id: string
  status: RoundStatus
  startedAt: number
  lockedAt?: number
  selectedNominationId?: string
  suggestion?: SuggestionSnapshot
  genreRecommendation?: AppRecommendation | null
  ratingsRecommendation?: AppRecommendation | null
}

export type SuggestionSnapshot = {
  nominationId: string
  title: string
  author: string
  coverUrl: string | null
  genre: Genre
  why: string
  shortlist: Array<{
    id: string
    title: string
    author: string
    coverUrl: string | null
  }>
  appRecommendation?: AppRecommendation | null
  genreRecommendation?: AppRecommendation | null
  ratingsRecommendation?: AppRecommendation | null
}

export type HistoryBook = {
  id: string
  roundId: string
  olid: string
  title: string
  author: string
  coverUrl: string | null
  genre: Genre
  finishedAt: number
  ratings: Record<string, number>
  notes?: Record<string, string>
  subjects?: string[]
}

export type DislikedRec = {
  olid: string
  title: string
  userId?: string
}

export type Club = {
  name: string
  code: string
  createdBy: string
  currentRoundId: string
  currentBookId: string | null
  currentBook: CurrentBook | null
  createdAt: number
  dislikedRecs: DislikedRec[]
}

export type ClubState = {
  club: Club
  members: Member[]
  rules: Rule[]
  round: Round | null
  genreVotes: Record<string, Genre[]>
  nominations: Nomination[]
  history: HistoryBook[]
  recVotes: Record<string, Partial<Record<RecSource, RecVote>>>
}

export type ScoredNomination = Nomination & {
  score: number
  why: string
}
