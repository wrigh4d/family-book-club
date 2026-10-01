import type { AuthorSpotlight } from './authorSpotlight'

export const SECONDARY_ROTATION_MS = 10_000

export type PanelComment = {
  id: string
  name: string
  text: string
  at: number
}

export type PanelRating = {
  id: string
  name: string
  stars: number
}

export type SecondaryPanelKind = 'comments' | 'ratings' | 'featured' | 'spotlight'

export type SecondaryPanel =
  | { kind: 'comments'; comments: PanelComment[] }
  | { kind: 'ratings'; ratings: PanelRating[] }
  | { kind: 'featured'; comment: PanelComment }
  | { kind: 'spotlight'; spotlight: AuthorSpotlight }

/** Build Present secondary carousel slides, skipping empty ones. */
export function buildSecondaryPanels(input: {
  comments: PanelComment[]
  ratings: PanelRating[]
  featured: PanelComment | null
  spotlight: AuthorSpotlight
}): SecondaryPanel[] {
  const panels: SecondaryPanel[] = []
  if (input.comments.length > 0) {
    panels.push({ kind: 'comments', comments: input.comments })
  }
  if (input.ratings.length > 0) {
    panels.push({ kind: 'ratings', ratings: input.ratings })
  }
  if (input.featured) {
    panels.push({ kind: 'featured', comment: input.featured })
  }
  panels.push({ kind: 'spotlight', spotlight: input.spotlight })
  return panels
}

export function nextSecondaryIndex(current: number, length: number): number {
  if (length <= 0) return 0
  return (current + 1) % length
}
