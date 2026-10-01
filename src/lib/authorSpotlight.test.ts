import { describe, expect, it } from 'vitest'
import {
  cleanBioSnippet,
  funFactFromAuthor,
  normalizeAuthorKey,
  resolveAuthorSpotlight,
} from './authorSpotlight'

describe('normalizeAuthorKey', () => {
  it('collapses punctuation and case', () => {
    expect(normalizeAuthorKey('J.K. Rowling')).toBe('j k rowling')
    expect(normalizeAuthorKey('J. R. R. Tolkien')).toBe('j r r tolkien')
  })
})

describe('cleanBioSnippet', () => {
  it('takes a short first sentence without wiki noise', () => {
    const raw =
      'Roald Dahl was a British novelist. ([Source][1].)\n\n[1]:http://example.com'
    expect(cleanBioSnippet(raw)).toBe('Roald Dahl was a British novelist.')
  })

  it('returns null for tiny scraps', () => {
    expect(cleanBioSnippet('Short.')).toBeNull()
  })
})

describe('funFactFromAuthor', () => {
  it('prefers bio snippets', () => {
    const fact = funFactFromAuthor({
      name: 'Roald Dahl',
      bio: { value: 'Roald Dahl was a British novelist, short story writer, and screenwriter.' },
    })
    expect(fact?.kind).toBe('fact')
    expect(fact?.text).toContain('British novelist')
    expect(fact?.attribution).toBe('Roald Dahl')
  })

  it('falls back to birth dates', () => {
    const fact = funFactFromAuthor({
      name: 'Ada',
      birth_date: '10 December 1815',
      death_date: '27 November 1852',
    })
    expect(fact?.text).toBe('Born 10 December 1815, died 27 November 1852.')
  })
})

describe('resolveAuthorSpotlight', () => {
  it('uses curated author quotes when available', () => {
    const row = resolveAuthorSpotlight({ author: 'Mark Twain', title: 'Tom Sawyer' })
    expect(row.kind).toBe('quote')
    expect(row.attribution).toBe('Mark Twain')
    expect(row.text.includes('\u2014')).toBe(false)
  })

  it('prefers curated over live Open Library facts', () => {
    const row = resolveAuthorSpotlight(
      { author: 'Stephen King' },
      { kind: 'fact', text: 'Live fact', attribution: 'Stephen King' },
    )
    expect(row.kind).toBe('quote')
    expect(row.text).toContain('portable magic')
  })

  it('uses live facts when no curated match exists', () => {
    const row = resolveAuthorSpotlight(
      { author: 'Unknown Novelist' },
      { kind: 'fact', text: 'Wrote many quiet books about rivers.', attribution: 'Unknown Novelist' },
    )
    expect(row.text).toContain('quiet books')
  })

  it('returns a default when nothing else fits', () => {
    const row = resolveAuthorSpotlight(null)
    expect(row.kind).toBe('fact')
    expect(row.attribution).toBe('Family Book Club')
  })
})
