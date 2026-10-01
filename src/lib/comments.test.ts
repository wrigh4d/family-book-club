import { describe, expect, it } from 'vitest'
import type { BookComment, Member } from '../types'
import {
  appendBookComment,
  commentsEmptyMessage,
  commentsForDisplay,
  formatCommentTime,
  migrateBookComments,
  sortCommentsNewestFirst,
} from './comments'

const members: Member[] = [
  { id: 'u1', displayName: 'Nick', role: 'owner', joinedAt: 1 },
  { id: 'u2', displayName: 'Dad', role: 'member', joinedAt: 2 },
]

describe('migrateBookComments', () => {
  it('prefers flat comments[] when present', () => {
    expect(
      migrateBookComments({
        comments: [
          { id: 'c1', uid: 'u1', name: 'Nick', text: 'Loved it', at: 100 },
          { id: 'c2', uid: 'u1', name: 'Nick', text: '  ', at: 200 },
        ],
        notes: { u1: 'legacy should be ignored' },
      }),
    ).toEqual([{ id: 'c1', uid: 'u1', name: 'Nick', text: 'Loved it', at: 100 }])
  })

  it('migrates legacy string notes into one-item lists', () => {
    expect(
      migrateBookComments({
        notes: { u1: 'First take', u2: '  ', u3: 'Also good' },
      }),
    ).toEqual([
      { id: 'legacy-u1', uid: 'u1', name: 'Reader', text: 'First take', at: 0 },
      { id: 'legacy-u3', uid: 'u3', name: 'Reader', text: 'Also good', at: 0 },
    ])
  })

  it('migrates notes[uid] arrays of {text, at}', () => {
    expect(
      migrateBookComments({
        notes: {
          u1: [
            { text: 'One', at: 10 },
            { text: 'Two', at: 20, id: 'kept', name: 'Nick' },
          ],
        },
      }),
    ).toEqual([
      { id: 'legacy-u1-0', uid: 'u1', name: 'Reader', text: 'One', at: 10 },
      { id: 'kept', uid: 'u1', name: 'Nick', text: 'Two', at: 20 },
    ])
  })
})

describe('appendBookComment', () => {
  it('appends without overwriting prior comments from the same member', () => {
    const existing: BookComment[] = [
      { id: 'c1', uid: 'u1', name: 'Nick', text: 'First', at: 1 },
    ]
    const next = appendBookComment(existing, {
      uid: 'u1',
      name: 'Nick',
      text: 'Second',
      at: 2,
      id: 'c2',
    })
    expect(next).toHaveLength(2)
    expect(next.map((row) => row.text)).toEqual(['First', 'Second'])
    expect(existing).toHaveLength(1)
  })

  it('ignores blank text', () => {
    expect(appendBookComment([], { uid: 'u1', name: 'Nick', text: '   ' })).toEqual([])
  })
})

describe('commentsForDisplay', () => {
  it('lists all club comments newest first with member names', () => {
    const comments: BookComment[] = [
      { id: 'c1', uid: 'u1', name: 'Reader', text: 'Older', at: 10 },
      { id: 'c2', uid: 'u2', name: 'Dad', text: 'Newer', at: 20 },
      { id: 'c3', uid: 'u1', name: 'Nick', text: 'Newest', at: 30 },
    ]
    expect(commentsForDisplay(comments, members)).toEqual([
      { id: 'c3', name: 'Nick', text: 'Newest', at: 30 },
      { id: 'c2', name: 'Dad', text: 'Newer', at: 20 },
      { id: 'c1', name: 'Nick', text: 'Older', at: 10 },
    ])
  })
})

describe('sortCommentsNewestFirst', () => {
  it('orders by at descending', () => {
    expect(
      sortCommentsNewestFirst([
        { id: 'a', uid: 'u', name: 'A', text: 'a', at: 1 },
        { id: 'b', uid: 'u', name: 'B', text: 'b', at: 3 },
        { id: 'c', uid: 'u', name: 'C', text: 'c', at: 2 },
      ]).map((row) => row.id),
    ).toEqual(['b', 'c', 'a'])
  })
})

describe('formatCommentTime', () => {
  const now = new Date(2026, 8, 30, 18, 0).getTime()

  it('returns empty for missing timestamps', () => {
    expect(formatCommentTime(0, now, 'en-US')).toBe('')
    expect(formatCommentTime(-1, now, 'en-US')).toBe('')
  })

  it('labels same-day comments with Today', () => {
    const sameDay = new Date(2026, 8, 30, 15, 42).getTime()
    expect(formatCommentTime(sameDay, now, 'en-US')).toBe('Today, 3:42 PM')
  })

  it('shows month and day within the same year', () => {
    const earlier = new Date(2026, 8, 29, 15, 42).getTime()
    expect(formatCommentTime(earlier, now, 'en-US')).toBe('Sep 29, 3:42 PM')
  })

  it('includes the year when needed', () => {
    const priorYear = new Date(2025, 11, 1, 9, 5).getTime()
    expect(formatCommentTime(priorYear, now, 'en-US')).toBe('Dec 1, 2025, 9:05 AM')
  })
})

describe('commentsEmptyMessage', () => {
  it('encourages the first comment when composing', () => {
    expect(commentsEmptyMessage()).toBe('No comments yet. Be the first.')
    expect(commentsEmptyMessage(false)).toBe('No comments yet. Be the first.')
  })

  it('uses view-only copy for History', () => {
    expect(commentsEmptyMessage(true)).toBe('No comments.')
  })
})
