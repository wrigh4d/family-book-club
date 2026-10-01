import { describe, expect, it } from 'vitest'
import {
  meetingGridClass,
  meetingMode,
  meetingSideClass,
  meetingVoiceClass,
} from './meetingStage'

const empty = { comments: 0, ratings: 0 }

describe('meetingMode', () => {
  it('scrolls below the stage on phones', () => {
    expect(meetingMode(false, empty)).toEqual({ kind: 'scroll' })
    expect(meetingMode(false, { comments: 1, ratings: 0 })).toEqual({ kind: 'scroll' })
  })

  it('gives the stage to the book when nothing sits beside it', () => {
    expect(meetingMode(true, empty)).toEqual({ kind: 'book' })
  })

  it('pairs comments and ratings only when both exist', () => {
    const paired = meetingMode(true, { comments: 2, ratings: 4 })
    expect(paired).toEqual({ kind: 'side', pair: true })
    expect(meetingVoiceClass(paired)).toContain('grid-cols-2')
    expect(meetingGridClass(paired, false)).toContain('minmax(17rem,0.9fr)')

    const commentsOnly = meetingMode(true, { comments: 1, ratings: 0 })
    expect(commentsOnly).toEqual({ kind: 'side', pair: false })
    expect(meetingVoiceClass(commentsOnly)).not.toContain('grid-cols-2')
  })

  it('keeps the phone stack out of the locked grid', () => {
    const mode = meetingMode(false, { comments: 1, ratings: 1 })
    expect(meetingGridClass(mode, true)).toContain('flex-col')
    expect(meetingSideClass(mode)).not.toContain('h-full')
    expect(meetingSideClass(meetingMode(true, empty))).toContain('h-full')
  })
})
