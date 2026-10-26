import { describe, expect, it } from 'vitest'
import { genreFromSubjects, workDescriptionText } from './openLibrary'

describe('genreFromSubjects', () => {
  it('maps Open Library subjects onto club genres, specific tags first', () => {
    expect(genreFromSubjects(['Horror', 'Fiction'])).toBe('Horror')
    expect(genreFromSubjects(['Science fiction'])).toBe('Science Fiction')
    expect(genreFromSubjects(['unknown tag'])).toBe('Literary')
  })
})

describe('workDescriptionText', () => {
  it('keeps a string description', () => {
    expect(workDescriptionText('  A fox and a farm.  ')).toBe('A fox and a farm.')
  })

  it('reads the value from a text object', () => {
    expect(workDescriptionText({ type: '/type/text', value: 'A long road.' })).toBe('A long road.')
  })

  it('drops a missing, blank, or unexpected description', () => {
    expect(workDescriptionText(undefined)).toBeNull()
    expect(workDescriptionText('   ')).toBeNull()
    expect(workDescriptionText({ value: 12 })).toBeNull()
    expect(workDescriptionText(['A sentence'])).toBeNull()
  })
})
