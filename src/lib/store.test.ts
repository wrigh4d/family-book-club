import { describe, expect, it } from 'vitest'
import { clubIdFromMemberPath, currentRoundHasVotes, memberWriteNeeded } from './store'

describe('memberWriteNeeded', () => {
  it('creates when there is no member doc', () => {
    expect(memberWriteNeeded(null, 'Nick')).toBe('create')
  })

  it('skips a write when the name is already stored', () => {
    expect(memberWriteNeeded({ displayName: 'Nick' }, 'Nick')).toBeNull()
  })

  it('renames when the stored name differs', () => {
    expect(memberWriteNeeded({ displayName: 'Dad' }, 'Nick')).toBe('rename')
  })
})

describe('clubIdFromMemberPath', () => {
  it('reads the club code from a member document path', () => {
    expect(clubIdFromMemberPath('clubs/AB3K7Q/members/uid1')).toBe('AB3K7Q')
    expect(clubIdFromMemberPath('/clubs/AB3K7Q/members/uid1')).toBe('AB3K7Q')
  })

  it('rejects paths that are not club members', () => {
    expect(clubIdFromMemberPath('members/uid1')).toBeNull()
    expect(clubIdFromMemberPath('clubs/AB3K7Q/rules/r1')).toBeNull()
    expect(clubIdFromMemberPath('')).toBeNull()
  })
})

describe('currentRoundHasVotes', () => {
  it('is false until someone has picked a genre', () => {
    expect(currentRoundHasVotes({})).toBe(false)
    expect(currentRoundHasVotes({ u1: [] })).toBe(false)
    expect(currentRoundHasVotes({ u1: [], u2: ['Fantasy'] })).toBe(true)
  })
})
