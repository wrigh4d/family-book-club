import {describe, expect, it} from 'vitest'
import {formatBookFacts} from './bookMeta'

describe('formatBookFacts', () => {
    it('joins genre, year, and page count', () => {
        expect(
            formatBookFacts({genre: 'Fantasy', firstPublishYear: 1965, pageCount: 412}),
        ).toBe('Fantasy · 1965 · 412 pages')
    })

    it('omits missing pieces', () => {
        expect(formatBookFacts({genre: 'Mystery'})).toBe('Mystery')
        expect(formatBookFacts({firstPublishYear: 2001, pageCount: 320})).toBe('2001 · 320 pages')
        expect(formatBookFacts({})).toBe('')
    })
})
