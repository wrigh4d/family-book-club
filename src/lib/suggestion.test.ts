import {describe, expect, it} from 'vitest'
import {
    appRecommendationWhy,
    genreLean,
    ratingsRecommendationWhy,
    scoreNominations,
    splitTagTaste,
    tagTasteFromHistory,
    topWantedGenre,
} from './suggestion'
import type {HistoryBook, Nomination} from '../types'

function nom(partial: Partial<Nomination> & Pick<Nomination, 'id' | 'genre'>): Nomination {
    return {
        olid: partial.id,
        title: partial.title ?? partial.id,
        author: 'Author',
        coverUrl: null,
        firstPublishYear: null,
        pageCount: null,
        nominatedBy: 'u1',
        nominatedByName: 'Nick',
        alreadyReadBy: [],
        createdAt: 1,
        ...partial,
    }
}

describe('scoreNominations', () => {
    it('ranks the book that matches this round’s genre votes first', () => {
        const ranked = scoreNominations(
            [
                nom({id: 'nf', genre: 'Non-fiction', createdAt: 1}),
                nom({id: 'fan', genre: 'Fantasy', createdAt: 2}),
            ],
            {a: ['Fantasy'], b: ['Fantasy'], c: ['Mystery']},
            [],
        )
        expect(ranked[0]?.id).toBe('fan')
    })

    it('boosts a genre the group has rated well in the past', () => {
        const history: HistoryBook[] = [
            {
                id: 'old',
                roundId: 'r0',
                olid: 'old',
                title: 'Loved fantasy',
                author: 'A',
                coverUrl: null,
                genre: 'Fantasy',
                finishedAt: 1,
                ratings: {a: 5, b: 5},
            },
        ]
        const ranked = scoreNominations(
            [
                nom({id: 'nf', genre: 'Non-fiction'}),
                nom({id: 'fan', genre: 'Fantasy'}),
            ],
            {a: ['Fantasy', 'Non-fiction'], b: ['Fantasy', 'Non-fiction']},
            history,
        )
        expect(ranked[0]?.id).toBe('fan')
    })

    it('soft-penalizes books people already read, without banning them', () => {
        const ranked = scoreNominations(
            [
                nom({
                    id: 'read',
                    genre: 'Fantasy',
                    alreadyReadBy: ['a', 'b', 'c'],
                    createdAt: 1,
                }),
                nom({id: 'fresh', genre: 'Fantasy', createdAt: 2}),
            ],
            {a: ['Fantasy']},
            [],
        )
        expect(ranked[0]?.id).toBe('fresh')
        expect(ranked[1]?.id).toBe('read')
    })

    it('breaks ties with the earlier nomination', () => {
        const ranked = scoreNominations(
            [
                nom({id: 'later', genre: 'Fantasy', createdAt: 20}),
                nom({id: 'earlier', genre: 'Fantasy', createdAt: 10}),
            ],
            {},
            [],
        )
        expect(ranked[0]?.id).toBe('earlier')
    })
})

describe('genreLean', () => {
    it('counts unique votes per member list', () => {
        const lean = genreLean({
            a: ['Fantasy', 'Mystery'],
            b: ['Fantasy'],
        })
        expect(lean[0]).toEqual({genre: 'Fantasy', count: 2})
        expect(lean[1]).toEqual({genre: 'Mystery', count: 1})
    })
})

describe('topWantedGenre', () => {
    it('returns the most-voted genre and voter count', () => {
        expect(
            topWantedGenre({
                a: ['Fantasy', 'Mystery'],
                b: ['Fantasy'],
            }),
        ).toEqual({genre: 'Fantasy', count: 2, voterCount: 2})
    })

    it('returns null when nobody has voted', () => {
        expect(topWantedGenre({})).toBeNull()
    })
})

describe('appRecommendationWhy', () => {
    it('explains a popular title outside the shortlist', () => {
        expect(appRecommendationWhy('Fantasy', 2, 3)).toContain('not on your shortlist')
        expect(appRecommendationWhy('Fantasy', 2, 3)).toContain('2 of 3 want Fantasy')
    })
})

describe('tagTasteFromHistory', () => {
    it('loves tags from 5-star books and avoids tags from disliked books', () => {
        const taste = tagTasteFromHistory([
            {
                id: '1',
                roundId: 'r1',
                olid: 'hp',
                title: 'Hidden Pictures',
                author: 'Jason Rekulak',
                coverUrl: null,
                genre: 'Horror',
                finishedAt: 1,
                ratings: {a: 5, b: 5},
                subjects: ['Horror', 'Thriller'],
            },
            {
                id: '2',
                roundId: 'r2',
                olid: 'nf',
                title: 'A dry non-fiction',
                author: 'A',
                coverUrl: null,
                genre: 'Non-fiction',
                finishedAt: 2,
                ratings: {a: 1, b: 2},
                subjects: ['Non-fiction'],
            },
        ])
        const {loved, avoided} = splitTagTaste(taste)
        expect(loved.map((row) => row.tag)).toEqual(expect.arrayContaining(['horror', 'thriller']))
        expect(avoided.map((row) => row.tag)).toContain('non-fiction')
    })

    it('averages a tag across multiple books', () => {
        const taste = tagTasteFromHistory([
            {
                id: '1',
                roundId: 'r1',
                olid: 'a',
                title: 'A',
                author: 'A',
                coverUrl: null,
                genre: 'Mystery',
                finishedAt: 1,
                ratings: {a: 5},
                subjects: ['Mystery'],
            },
            {
                id: '2',
                roundId: 'r2',
                olid: 'b',
                title: 'B',
                author: 'B',
                coverUrl: null,
                genre: 'Mystery',
                finishedAt: 2,
                ratings: {a: 3},
                subjects: ['Mystery'],
            },
        ])
        expect(taste[0]?.tag).toBe('mystery')
        expect(taste[0]?.average).toBe(4)
        expect(taste[0]?.bookCount).toBe(2)
    })
})

describe('ratingsRecommendationWhy', () => {
    it('mentions loved and avoided tags', () => {
        const why = ratingsRecommendationWhy(
            [{tag: 'horror', average: 5, bookCount: 1}],
            [{tag: 'non-fiction', average: 1.5, bookCount: 1}],
        )
        expect(why).toContain('horror')
        expect(why).toContain('non-fiction')
    })
})
