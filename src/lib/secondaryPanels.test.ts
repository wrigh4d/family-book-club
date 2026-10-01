import { describe, expect, it } from 'vitest'
import {
  SECONDARY_ROTATION_MS,
  buildSecondaryPanels,
  nextSecondaryIndex,
  type PanelComment,
  type PanelRating,
} from './secondaryPanels'

const comment = (id: string, text: string): PanelComment => ({
  id,
  name: 'Reader',
  text,
  at: 1,
})

const rating = (id: string, stars: number): PanelRating => ({
  id,
  name: 'Reader',
  stars,
})

describe('buildSecondaryPanels', () => {
  const spotlight = {
    kind: 'quote' as const,
    text: 'Books are magic.',
    attribution: 'Author',
  }

  it('always includes the author spotlight', () => {
    const panels = buildSecondaryPanels({
      comments: [],
      ratings: [],
      featured: null,
      spotlight,
    })
    expect(panels).toEqual([{ kind: 'spotlight', spotlight }])
  })

  it('skips empty comments and ratings but keeps featured when present', () => {
    const featured = comment('f', 'A long thoughtful club note about the ending.')
    const panels = buildSecondaryPanels({
      comments: [],
      ratings: [],
      featured,
      spotlight,
    })
    expect(panels.map((p) => p.kind)).toEqual(['featured', 'spotlight'])
  })

  it('orders comments, ratings, featured, then spotlight', () => {
    const comments = [comment('c', 'Loved the pace of this one a lot.')]
    const ratings = [rating('r', 5)]
    const featured = comments[0]
    const panels = buildSecondaryPanels({
      comments,
      ratings,
      featured,
      spotlight,
    })
    expect(panels.map((p) => p.kind)).toEqual([
      'comments',
      'ratings',
      'featured',
      'spotlight',
    ])
  })
})

describe('nextSecondaryIndex', () => {
  it('wraps around the carousel', () => {
    expect(nextSecondaryIndex(0, 3)).toBe(1)
    expect(nextSecondaryIndex(2, 3)).toBe(0)
    expect(nextSecondaryIndex(0, 0)).toBe(0)
  })
})

describe('SECONDARY_ROTATION_MS', () => {
  it('stays in the slow 8 to 12 second range', () => {
    expect(SECONDARY_ROTATION_MS).toBeGreaterThanOrEqual(8_000)
    expect(SECONDARY_ROTATION_MS).toBeLessThanOrEqual(12_000)
  })
})
