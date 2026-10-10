import { describe, expect, it } from 'vitest'
import {
  commentHistoryBook,
  commitReaction,
  finishHistoryFields,
  historySetWithNotesClear,
  rateHistoryBook,
  subjectList,
  type HistoryHeader,
} from './historyWrite'
import type { CurrentBook, HistoryBook } from '../types'

const clearNotes = Symbol('delete')

const header: HistoryHeader = {
  roundId: 'r1',
  olid: '/works/OL1',
  title: 'Dune',
  author: 'Frank Herbert',
  coverUrl: null,
  genre: 'Science Fiction',
}

const dune: CurrentBook = {
  ...header,
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
    comments: [],
    subjects: ['deserts'],
  }
}

describe('rateHistoryBook', () => {
  it('stores stars, migrates notes, and does not finish the book', () => {
    const { data, options } = rateHistoryBook(
      { notes: { u1: 'Halfway' }, ratings: { u2: 3 } },
      { header, uid: 'u1', stars: 5 },
      clearNotes,
    )
    expect(options).toEqual({ merge: true })
    expect(data.notes).toBe(clearNotes)
    expect(data.ratings).toEqual({ u2: 3, u1: 5 })
    expect(data.comments).toEqual([
      { id: 'legacy-u1', uid: 'u1', name: 'Reader', text: 'Halfway', at: 0 },
    ])
    expect(data).not.toHaveProperty('finishedAt')
    expect(data.subjects).toEqual([])
  })

  it('keeps a finish time that was already stored', () => {
    const { data } = rateHistoryBook(
      { finishedAt: 100, ratings: {}, comments: [] },
      { header, uid: 'u1', stars: 4 },
      clearNotes,
    )
    expect(data.finishedAt).toBe(100)
  })
})

describe('commentHistoryBook', () => {
  it('appends a comment and clears notes on an existing row', () => {
    const write = commentHistoryBook(
      {
        notes: { u2: 'Old' },
        ratings: { u1: 5 },
        comments: [{ id: 'c1', uid: 'u1', name: 'Ada', text: 'Hi', at: 1 }],
      },
      { header, uid: 'u2', name: 'Ben', text: 'Also good', at: 20, id: 'c2' },
      clearNotes,
    )
    expect(write?.options).toEqual({ merge: true })
    expect(write?.data.notes).toBe(clearNotes)
    expect(write?.data.comments).toEqual([
      { id: 'c1', uid: 'u1', name: 'Ada', text: 'Hi', at: 1 },
      { id: 'c2', uid: 'u2', name: 'Ben', text: 'Also good', at: 20 },
    ])
    expect(write?.data).not.toHaveProperty('ratings')
    expect(write?.data).not.toHaveProperty('finishedAt')
  })

  it('starts a missing row from the book header', () => {
    const write = commentHistoryBook(
      null,
      { header, uid: 'u1', name: 'Ada', text: 'Hello', at: 5, id: 'c1', subjects: ['deserts'] },
      clearNotes,
    )
    expect(write?.data).toMatchObject({
      title: 'Dune',
      olid: '/works/OL1',
      ratings: {},
      subjects: ['deserts'],
      comments: [{ id: 'c1', uid: 'u1', name: 'Ada', text: 'Hello', at: 5 }],
    })
    expect(write?.data).not.toHaveProperty('finishedAt')
    expect(write?.data.notes).toBe(clearNotes)
  })

  it('does not write a blank comment', () => {
    expect(
      commentHistoryBook(
        null,
        { header, uid: 'u1', name: 'Ada', text: '   ', at: 5, id: 'c1' },
        clearNotes,
      ),
    ).toBeNull()
  })
})

describe('commitReaction', () => {
  it('records a comment even when subject lookup never returns', async () => {
    let wrote = false
    await commitReaction(
      {
        write: async () => {
          wrote = true
        },
        lookupSubjects: () => new Promise(() => undefined),
        storeSubjects: async () => undefined,
      },
      [],
      dune.olid,
    )
    expect(wrote).toBe(true)
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
      comments: [],
      subjects: [],
    })
  })

  it('keeps a finish time that was already stored', () => {
    const fields = finishHistoryFields(dune, finished(100), 'r2', 500)
    expect(fields.finishedAt).toBe(100)
    expect(fields).not.toHaveProperty('ratings')
    expect(fields).not.toHaveProperty('comments')
    expect(fields).not.toHaveProperty('notes')
  })
})

describe('subjectList', () => {
  it('keeps looked-up subjects and falls back to the genre', () => {
    expect(subjectList(['deserts'], 'Science Fiction')).toEqual(['deserts'])
    expect(subjectList([], 'Science Fiction')).toEqual(['Science Fiction'])
  })
})

describe('historySetWithNotesClear', () => {
  it('always pairs deleteField-style notes clear with merge:true', () => {
    const clear = { _methodName: 'FieldValue.delete' }
    const { data, options } = historySetWithNotesClear(
      { comments: [], ratings: { u1: 4 }, title: 'Book' },
      clear,
    )
    expect(options).toEqual({ merge: true })
    expect(data.notes).toBe(clear)
    expect(data.comments).toEqual([])
    expect(data.ratings).toEqual({ u1: 4 })
    expect(data.title).toBe('Book')
  })

  it('does not mutate the input payload object', () => {
    const input = { comments: [{ id: 'c1' }] }
    const clear = Symbol('delete')
    historySetWithNotesClear(input, clear)
    expect(input).toEqual({ comments: [{ id: 'c1' }] })
    expect('notes' in input).toBe(false)
  })
})
