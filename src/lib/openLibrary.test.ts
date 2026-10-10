import { describe, expect, it } from 'vitest'
import { genreFromSubjects } from './openLibrary'

describe('genreFromSubjects', () => {
  it('maps Open Library subjects onto club genres, specific tags first', () => {
    expect(genreFromSubjects(['Horror', 'Fiction'])).toBe('Horror')
    expect(genreFromSubjects(['Science fiction'])).toBe('Science Fiction')
    expect(genreFromSubjects(['unknown tag'])).toBe('Literary')
  })
})
