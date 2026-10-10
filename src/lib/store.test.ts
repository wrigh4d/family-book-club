import { describe, expect, it } from 'vitest'
import {
  clubIdFromMemberPath,
  currentRoundHasVotes,
  memberWriteNeeded,
  nextGenreSeed,
  needsClubIndex,
} from './store'

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

describe('needsClubIndex', () => {
  it('skips the scan once the user doc records a finished index', () => {
    expect(needsClubIndex({ clubsIndexedAt: 1 })).toBe(false)
  })

  it('scans until that finished index is stored', () => {
    expect(needsClubIndex(undefined)).toBe(true)
    expect(needsClubIndex({})).toBe(true)
    expect(needsClubIndex({ clubsIndexedAt: '1' })).toBe(true)
  })
})

describe('currentRoundHasVotes', () => {
  it('is false until someone has picked a genre', () => {
    expect(currentRoundHasVotes({})).toBe(false)
    expect(currentRoundHasVotes({ u1: [] })).toBe(false)
    expect(currentRoundHasVotes({ u1: [], u2: ['Fantasy'] })).toBe(true)
  })
})

describe('nextGenreSeed', () => {
  const base = {
    roundId: 'r2',
    votes: {} as Record<string, never>,
    previousRoundId: 'r1' as string | null,
    waitedRoundId: null as string | null,
    seededRoundId: null as string | null,
  }

  it('waits one snapshot before seeding', () => {
    expect(nextGenreSeed(base)).toEqual({
      action: 'wait',
      waitedRoundId: 'r2',
      seededRoundId: null,
      previousRoundId: null,
    })
    expect(nextGenreSeed({ ...base, waitedRoundId: 'r2' })).toEqual({
      action: 'seed',
      waitedRoundId: 'r2',
      seededRoundId: 'r2',
      previousRoundId: 'r1',
    })
  })

  it('skips a round that already has votes, without marking it seeded', () => {
    expect(
      nextGenreSeed({ ...base, votes: { u1: ['Fantasy'] }, waitedRoundId: null }),
    ).toMatchObject({ action: 'skip', waitedRoundId: 'r2', seededRoundId: null })
  })

  it('seeds again after every genre is cleared', () => {
    expect(
      nextGenreSeed({
        ...base,
        votes: {},
        waitedRoundId: 'r2',
        seededRoundId: null,
      }),
    ).toMatchObject({ action: 'seed', previousRoundId: 'r1' })
  })

  it('does not retry a round it already seeded', () => {
    expect(nextGenreSeed({ ...base, waitedRoundId: 'r2', seededRoundId: 'r2' })).toMatchObject({
      action: 'skip',
      seededRoundId: 'r2',
    })
  })

  it('remembers a round that has no previous round and does not write', () => {
    expect(nextGenreSeed({ ...base, previousRoundId: null, waitedRoundId: 'r2' })).toEqual({
      action: 'skip',
      waitedRoundId: 'r2',
      seededRoundId: 'r2',
      previousRoundId: null,
    })
  })
})
