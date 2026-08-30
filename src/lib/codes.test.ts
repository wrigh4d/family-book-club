import {describe, expect, it} from 'vitest'
import {normalizeClubCode, randomClubCode} from './codes'

describe('randomClubCode', () => {
    it('returns the requested length from the safe alphabet', () => {
        const code = randomClubCode(6)
        expect(code).toHaveLength(6)
        expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/)
    })
})

describe('normalizeClubCode', () => {
    it('uppercases and strips junk', () => {
        expect(normalizeClubCode(' ab-3k7q ')).toBe('AB3K7Q')
    })
})
