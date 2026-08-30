import {describe, expect, it} from 'vitest'
import {asGenre, isGenre} from '../types'
import {asRound, asRoundStatus, parseAppRec, parseCurrentBook, parseGenreList} from './clubParse'

describe('asGenre', () => {
    it('keeps known genres and falls back to Literary', () => {
        expect(isGenre('Fantasy')).toBe(true)
        expect(asGenre('Fantasy')).toBe('Fantasy')
        expect(asGenre('not-a-genre')).toBe('Literary')
        expect(asGenre(null)).toBe('Literary')
    })
})

describe('parseGenreList', () => {
    it('drops unknown values and duplicates', () => {
        expect(parseGenreList(['Fantasy', 'Fantasy', 'nope', 3, 'Mystery'])).toEqual([
            'Fantasy',
            'Mystery',
        ])
        expect(parseGenreList(null)).toEqual([])
    })
})

describe('asRoundStatus', () => {
    it('maps legacy locked onto presenting', () => {
        expect(asRoundStatus('locked')).toBe('presenting')
        expect(asRoundStatus('presenting')).toBe('presenting')
        expect(asRoundStatus('concluding')).toBe('concluding')
        expect(asRoundStatus('other')).toBe('collecting')
    })
})

describe('parseCurrentBook', () => {
    it('requires a title and fills the rest', () => {
        expect(parseCurrentBook({title: 'Dune', author: 'Herbert', olid: '/works/OL1'})).toEqual({
            olid: '/works/OL1',
            title: 'Dune',
            author: 'Herbert',
            coverUrl: null,
            genre: 'Literary',
            firstPublishYear: null,
            pageCount: null,
        })
        expect(
            parseCurrentBook({
                title: 'Dune',
                firstPublishYear: 1965,
                pageCount: 412,
            }),
        ).toMatchObject({firstPublishYear: 1965, pageCount: 412})
        expect(parseCurrentBook({author: 'No title'})).toBeNull()
    })
})

describe('parseAppRec', () => {
    it('requires olid and title', () => {
        expect(parseAppRec({olid: '/works/OL1', title: 'Dune', source: 'ratings'})?.source).toBe(
            'ratings',
        )
        expect(parseAppRec({title: 'No id'})).toBeNull()
    })
})

describe('asRound', () => {
    it('reads recs from the round, then the suggestion snapshot', () => {
        const round = asRound('r1', {
            status: 'presenting',
            suggestion: {
                title: 'Meeting',
                appRecommendation: {olid: '/works/OL2', title: 'Legacy'},
                ratingsRecommendation: {olid: '/works/OL3', title: 'Rated'},
            },
        })
        expect(round.genreRecommendation?.title).toBe('Legacy')
        expect(round.ratingsRecommendation?.title).toBe('Rated')
    })
})
