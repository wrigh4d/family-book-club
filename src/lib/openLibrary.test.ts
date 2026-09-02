import { describe, expect, it } from 'vitest'
import { genreFromSubjects, isSameRecommendedBook } from './openLibrary'

describe('isSameRecommendedBook', () => {
  it('matches the same Open Library work id', () => {
    expect(
      isSameRecommendedBook({ olid: '/works/OL1W', title: 'Other title' }, [
        { olid: '/works/OL1W', title: 'Alice' },
      ]),
    ).toBe(true)
  })

  it('treats Alice in Wonderland variants as the same disliked book', () => {
    expect(
      isSameRecommendedBook({ olid: '/works/OL2W', title: "Alice's Adventures in Wonderland" }, [
        { olid: '/works/OL1W', title: 'Alice in Wonderland' },
      ]),
    ).toBe(true)
  })

  it('maps Open Library subjects onto club genres, specific tags first', () => {
    expect(genreFromSubjects(['Horror', 'Fiction'])).toBe('Horror')
    expect(genreFromSubjects(['Science fiction'])).toBe('Science Fiction')
    expect(genreFromSubjects(['unknown tag'])).toBe('Literary')
  })

  it('does not match unrelated titles', () => {
    expect(
      isSameRecommendedBook({ olid: '/works/OL3W', title: 'The Hobbit' }, [
        { olid: '/works/OL1W', title: 'Alice in Wonderland' },
      ]),
    ).toBe(false)
  })
})
