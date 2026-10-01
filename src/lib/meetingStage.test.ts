import { describe, expect, it } from 'vitest'
import {
  meetingGridClass,
  meetingMode,
  meetingSideClass,
  meetingVoiceClass,
} from './meetingStage'

describe('meetingMode', () => {
  it('scrolls below the stage on phones', () => {
    expect(meetingMode(false, false)).toEqual({ kind: 'scroll' })
    expect(meetingMode(false, true)).toEqual({ kind: 'scroll' })
  })

  it('gives the stage to the book when nothing sits beside it', () => {
    expect(meetingMode(true, false)).toEqual({ kind: 'book' })
  })

  it('uses a single side column for the secondary carousel', () => {
    const side = meetingMode(true, true)
    expect(side).toEqual({ kind: 'side', pair: false })
    expect(meetingVoiceClass(side)).not.toContain('grid-cols-2')
    expect(meetingGridClass(side, false)).toContain('minmax(18rem,0.95fr)')
    expect(meetingGridClass(side, false)).toContain('2xl:grid-cols-')
  })

  it('keeps the phone stack out of the locked grid', () => {
    const mode = meetingMode(false, true)
    expect(meetingGridClass(mode, true)).toContain('flex-col')
    expect(meetingSideClass(mode)).not.toContain('h-full')
    expect(meetingSideClass(meetingMode(true, false))).toContain('h-full')
  })
})
