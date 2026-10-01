import { describe, expect, it } from 'vitest'
import { historySetWithNotesClear } from './historyWrite'

describe('historySetWithNotesClear', () => {
  it('always pairs deleteField-style notes clear with merge:true', () => {
    const clearNotes = { _methodName: 'FieldValue.delete' }
    const { data, options } = historySetWithNotesClear(
      { comments: [], ratings: { u1: 4 }, title: 'Book' },
      clearNotes,
    )
    expect(options).toEqual({ merge: true })
    expect(data.notes).toBe(clearNotes)
    expect(data.comments).toEqual([])
    expect(data.ratings).toEqual({ u1: 4 })
    expect(data.title).toBe('Book')
  })

  it('does not mutate the input payload object', () => {
    const input = { comments: [{ id: 'c1' }] }
    const clearNotes = Symbol('delete')
    historySetWithNotesClear(input, clearNotes)
    expect(input).toEqual({ comments: [{ id: 'c1' }] })
    expect('notes' in input).toBe(false)
  })
})
