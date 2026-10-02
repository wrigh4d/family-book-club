import { describe, expect, it } from 'vitest'
import { featuredQuote, type CommentLine } from './presentHelpers'

function comment(partial: Partial<CommentLine> & Pick<CommentLine, 'id' | 'text'>): CommentLine {
  return {
    name: partial.name ?? 'Reader',
    at: partial.at ?? 0,
    id: partial.id,
    text: partial.text,
  }
}

describe('featuredQuote', () => {
  it('returns null when there are no comments', () => {
    expect(featuredQuote([])).toBeNull()
  })

  it('prefers the longest substantive comment', () => {
    const short = comment({ id: 'a', text: 'Nice book.', at: 10 })
    const long = comment({
      id: 'b',
      text: 'This chapter changed how I saw the whole family story arc.',
      at: 5,
    })
    expect(featuredQuote([short, long])?.id).toBe('b')
  })

  it('breaks length ties with the newest comment', () => {
    const older = comment({
      id: 'old',
      text: 'Exactly forty characters of thoughtful text!!',
      at: 1,
    })
    const newer = comment({
      id: 'new',
      text: 'Exactly forty characters of thoughtful text!!',
      at: 9,
    })
    expect(featuredQuote([older, newer])?.id).toBe('new')
  })

  it('falls back to the longest short comment when none are substantive', () => {
    const a = comment({ id: 'a', text: 'Hi', at: 1 })
    const b = comment({ id: 'b', text: 'Loved it', at: 2 })
    expect(featuredQuote([a, b])?.id).toBe('b')
  })
})
