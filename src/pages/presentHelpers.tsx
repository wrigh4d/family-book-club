import { useEffect, useState } from 'react'
import { groupRating } from '../lib/bookStatus'
import { meetingRecsFromRound } from '../lib/recs'
import { commentsForDisplay } from '../lib/comments'
import { currentHistoryBook } from '../lib/store'
import type {
  AppRecommendation,
  ClubState,
  HistoryBook,
  Member,
} from '../types'

export type CommentLine = {
  id: string
  name: string
  text: string
}

export type RatingLine = {
  id: string
  name: string
  stars: number
}

export type RecSlide = {
  id: string
  label: string
  rec: AppRecommendation
}

export type Voice = {
  comments: CommentLine[]
  ratings: RatingLine[]
}

export type LastMeeting = {
  title: string
  average: string | null
}

export function presentActionClass(): string {
  return 'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gold/60 bg-transparent px-3 py-2 text-sm font-semibold text-gold transition duration-150 hover:bg-gold hover:text-ink hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1612] motion-safe:active:scale-[0.98]'
}

export function clubVoice(state: ClubState): Voice {
  const history = currentHistoryBook(state)
  const scores = history?.ratings ?? {}
  const comments: CommentLine[] = commentsForDisplay(
    history?.comments ?? [],
    state.members,
  ).map((row) => ({ id: row.id, name: row.name, text: row.text }))
  const ratings: RatingLine[] = []
  for (const member of state.members) {
    const stars = scores[member.id]
    if (stars != null) ratings.push({ id: member.id, name: member.displayName, stars })
  }
  ratings.sort((a, b) => b.stars - a.stars || a.name.localeCompare(b.name))
  return { comments, ratings }
}

export function recSlidesFromState(state: ClubState): RecSlide[] {
  const recs = meetingRecsFromRound(state)
  const slides: RecSlide[] = []
  if (recs.genre) {
    slides.push({
      id: `rec-genre-${recs.genre.olid}`,
      label: 'Genre favorite',
      rec: recs.genre,
    })
  }
  if (recs.ratings) {
    slides.push({
      id: `rec-ratings-${recs.ratings.olid}`,
      label: 'From past ratings',
      rec: recs.ratings,
    })
  }
  return slides
}

export function lastMeeting(history: HistoryBook[]): LastMeeting | null {
  const last = history.reduce<HistoryBook | null>((best, row) => {
    if (!best || row.finishedAt > best.finishedAt) return row
    return best
  }, null)
  if (!last) return null
  const group = groupRating(last.ratings)
  return { title: last.title, average: group ? group.average.toFixed(1) : null }
}

export function roomLine(members: Member[]): string {
  const names = members.map((member) => member.displayName).filter(Boolean)
  if (names.length === 0) return 'Just this club'
  if (names.length <= 4) return names.join(', ')
  const extra = names.length - 3
  return `${names.slice(0, 3).join(', ')}, and ${extra} more`
}

export const STAGE_QUERY = '(min-width: 1024px)'

export function useStageLayout(): boolean {
  const [stage, setStage] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(STAGE_QUERY).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(STAGE_QUERY)
    const apply = () => setStage(media.matches)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
  return stage
}
