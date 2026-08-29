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

export type RoundStatus = 'collecting' | 'locked' | 'reading' | 'done'

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

export type Round = {
  id: string
  status: RoundStatus
  startedAt: number
  lockedAt?: number
  selectedNominationId?: string
  suggestion?: SuggestionSnapshot
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
}

export type Club = {
  name: string
  code: string
  createdBy: string
  currentRoundId: string
  currentBookId: string | null
  createdAt: number
}

export type ClubState = {
  club: Club
  members: Member[]
  rules: Rule[]
  round: Round | null
  genreVotes: Record<string, Genre[]>
  nominations: Nomination[]
  history: HistoryBook[]
}

export type ScoredNomination = Nomination & {
  score: number
  why: string
}
