import { describe, expect, it } from 'vitest'
import {
  meetingGridClass,
  meetingMode,
  meetingSideClass,
  meetingVoiceClass,
  recCoverClass,
  recsFill,
} from './meetingStage'

const empty = { comments: 0, ratings: 0, recs: 0 }

describe('meetingMode', () => {
  it('scrolls below the stage and fills only when the club has not weighed in', () => {
    expect(meetingMode(false, empty)).toEqual({ kind: 'scroll', fill: false })
    expect(meetingMode(false, { comments: 0, ratings: 0, recs: 2 })).toEqual({
      kind: 'scroll',
      fill: true,
    })
    expect(meetingMode(false, { comments: 1, ratings: 0, recs: 1 })).toEqual({
      kind: 'scroll',
      fill: false,
    })
  })

  it('gives the stage to the book when nothing sits beside it', () => {
    expect(meetingMode(true, empty)).toEqual({ kind: 'book' })
  })

  it('splits the stage when recommendations are the only side content', () => {
    const mode = meetingMode(true, { comments: 0, ratings: 0, recs: 2 })
    expect(mode).toEqual({ kind: 'split' })
    expect(meetingGridClass(mode, true)).toContain('grid-cols-2')
    expect(recCoverClass(mode)).toContain('h-full')
    expect(recsFill(mode)).toBe(true)
  })

  it('pairs comments and ratings only when both exist', () => {
    const paired = meetingMode(true, { comments: 2, ratings: 4, recs: 1 })
    expect(paired).toEqual({ kind: 'side', pair: true })
    expect(meetingVoiceClass(paired)).toContain('grid-cols-2')
    expect(meetingGridClass(paired, false)).toContain('minmax(17rem,0.9fr)')

    const commentsOnly = meetingMode(true, { comments: 1, ratings: 0, recs: 0 })
    expect(commentsOnly).toEqual({ kind: 'side', pair: false })
    expect(meetingVoiceClass(commentsOnly)).not.toContain('grid-cols-2')
    expect(recCoverClass(commentsOnly)).toContain('h-20')
  })

  it('keeps the phone stack out of the locked grid', () => {
    const mode = meetingMode(false, { comments: 1, ratings: 1, recs: 1 })
    expect(meetingGridClass(mode, true)).toContain('flex-col')
    expect(meetingSideClass(mode)).not.toContain('h-full')
    expect(meetingSideClass(meetingMode(true, empty))).toContain('h-full')
  })
})
