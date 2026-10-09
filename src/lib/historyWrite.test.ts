import { describe, expect, it } from 'vitest'
import { commitReaction, finishHistoryFields, reactionFields, subjectList } from './historyWrite'
import type { CurrentBook, HistoryBook } from '../types'

const dune: CurrentBook = {
  olid: '/works/OL1',
  title: 'Dune',
  author: 'Frank Herbert',
  coverUrl: null,
  genre: 'Science Fiction',
  firstPublishYear: 1965,
  pageCount: 412,
}

function finished(finishedAt: number): HistoryBook {
  return {
    id: 'book-_works_OL1',
    roundId: 'r1',
    ...dune,
    finishedAt,
    ratings: { u1: 4 },
    notes: { u1: 'Loved it' },
    subjects: ['deserts'],
  }
}

describe('reactionFields', () => {
  it('records a rating without a finish time', () => {
    expect(reactionFields(dune, 'r1', 'u1', { stars: 5 })).toEqual({
      roundId: 'r1',
      olid: '/works/OL1',
      title: 'Dune',
      author: 'Frank Herbert',
      coverUrl: null,
      genre: 'Science Fiction',
      'ratings.u1': 5,
    })
  })

  it('records a comment without a finish time', () => {
    const fields = reactionFields(dune, 'r1', 'u1', { note: 'Halfway' })
    expect(fields['notes.u1']).toBe('Halfway')
    expect(fields).not.toHaveProperty('finishedAt')
  })
})

describe('commitReaction', () => {
  it('records a comment even when subject lookup never returns', async () => {
    let note: unknown
    await commitReaction(
      {
        write: async () => {
          note = reactionFields(dune, 'r1', 'u1', { note: 'Halfway' })['notes.u1']
        },
        lookupSubjects: () => new Promise(() => undefined),
        storeSubjects: async () => undefined,
      },
      [],
      dune.olid,
    )
    expect(note).toBe('Halfway')
  })

  it('records the rating even when subject lookup never returns', async () => {
    let written = false
    await commitReaction(
      {
        write: async () => {
          written = true
        },
        lookupSubjects: () => new Promise(() => undefined),
        storeSubjects: async () => undefined,
      },
      [],
      dune.olid,
    )
    expect(written).toBe(true)
  })

  it('does not look up subjects that are already stored', async () => {
    let lookedUp = false
    await commitReaction(
      {
        write: async () => undefined,
        lookupSubjects: async () => {
          lookedUp = true
          return ['deserts']
        },
        storeSubjects: async () => undefined,
      },
      ['deserts'],
      dune.olid,
    )
    expect(lookedUp).toBe(false)
  })
})

describe('finishHistoryFields', () => {
  it('records an unrated book when the club moves on', () => {
    expect(finishHistoryFields(dune, null, 'r1', 500)).toMatchObject({
      title: 'Dune',
      olid: '/works/OL1',
      finishedAt: 500,
      ratings: {},
      notes: {},
    })
  })

  it('keeps a finish time that was already stored', () => {
    const fields = finishHistoryFields(dune, finished(100), 'r2', 500)
    expect(fields.finishedAt).toBe(100)
    expect(fields).not.toHaveProperty('ratings')
    expect(fields).not.toHaveProperty('notes')
  })
})

describe('subjectList', () => {
  it('keeps looked-up subjects and falls back to the genre', () => {
    expect(subjectList(['deserts'], 'Science Fiction')).toEqual(['deserts'])
    expect(subjectList([], 'Science Fiction')).toEqual(['Science Fiction'])
  })
})
