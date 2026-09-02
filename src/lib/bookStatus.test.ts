import {describe, expect, it} from 'vitest'
import {
    availableShortlist,
    clubBookStatus,
    clubBookStatusLabel,
    groupRatingLabel,
    historyDocId,
    pastHistoryBooks,
    unfinishedHistoryForCurrent,
} from './bookStatus'
import type {ClubState, Nomination} from '../types'

function nomination(partial: Partial<Nomination> & Pick<Nomination, 'id' | 'olid' | 'title'>): Nomination {
    return {
        author: 'Author',
        coverUrl: null,
        genre: 'Literary',
        firstPublishYear: null,
        pageCount: null,
        nominatedBy: 'u1',
        nominatedByName: 'Nick',
        alreadyReadBy: [],
        createdAt: 1,
        ...partial,
    }
}

function state(partial: {
    current?: {olid: string; title: string} | null
    history?: Array<{olid: string; title: string}>
    nominations?: Nomination[]
}): ClubState {
    return {
        club: {
            name: 'Club',
            code: 'ABCD',
            createdBy: 'u1',
            currentRoundId: 'r1',
            previousRoundId: null,
            currentBookId: partial.current?.olid ?? null,
            currentBook: partial.current
                ? {
                      olid: partial.current.olid,
                      title: partial.current.title,
                      author: 'A',
                      coverUrl: null,
                      genre: 'Literary',
                      firstPublishYear: null,
                      pageCount: null,
                  }
                : null,
            createdAt: 1,
            dislikedRecs: [],
        },
        members: [],
        rules: [],
        round: null,
        genreVotes: {},
        nominations: partial.nominations ?? [],
        history: (partial.history ?? []).map((book, index) => ({
            id: `h${index}`,
            roundId: 'r0',
            olid: book.olid,
            title: book.title,
            author: 'A',
            coverUrl: null,
            genre: 'Literary',
            finishedAt: 1,
            ratings: {},
        })),
    }
}

describe('clubBookStatus', () => {
    const club = state({
        current: {olid: '/works/OL1', title: 'Dune'},
        history: [{olid: '/works/OL2', title: 'Emma'}],
        nominations: [nomination({id: 'n3', olid: '/works/OL3', title: 'Kindred'})],
    })

    it('flags the current book, finished books, and shortlist separately', () => {
        expect(clubBookStatus(club, {olid: '/works/OL1', title: 'Dune'})).toBe('current')
        expect(clubBookStatus(club, {olid: '/works/OL2', title: 'Emma'})).toBe('history')
        expect(clubBookStatus(club, {olid: '/works/OL3', title: 'Kindred'})).toBe('shortlist')
        expect(clubBookStatus(club, {olid: '/works/OL9', title: 'Fresh'})).toBeNull()
    })

    it('prefers current when the same book is also on the shortlist', () => {
        const overlap = state({
            current: {olid: '/works/OL1', title: 'Dune'},
            nominations: [nomination({id: 'n1', olid: '/works/OL1', title: 'Dune'})],
        })
        expect(clubBookStatus(overlap, {olid: '/works/OL1', title: 'Dune'})).toBe('current')
        expect(availableShortlist(overlap)).toEqual([])
    })

    it('labels blocked statuses for the UI', () => {
        expect(clubBookStatusLabel('current')).toBe('Current book')
        expect(clubBookStatusLabel('history')).toBe('Already read')
        expect(clubBookStatusLabel('shortlist')).toBeNull()
    })

    it('does not treat other books in a series as the same work', () => {
        const potter = state({
            current: {olid: '/works/OL1', title: "Harry Potter and the Philosopher's Stone"},
            nominations: [
                nomination({
                    id: 'n2',
                    olid: '/works/OL2',
                    title: 'Harry Potter and the Chamber of Secrets',
                }),
            ],
        })
        expect(
            clubBookStatus(potter, {
                olid: '/works/OL3',
                title: 'Harry Potter and the Prisoner of Azkaban',
            }),
        ).toBeNull()
        expect(
            clubBookStatus(potter, {
                olid: '/works/OL2',
                title: 'Harry Potter and the Chamber of Secrets',
            }),
        ).toBe('shortlist')
    })
})

describe('unfinishedHistoryForCurrent', () => {
    it('returns only history for the unfinished current book', () => {
        const club = state({
            current: {olid: '/works/OL1', title: 'Dune'},
            history: [
                {olid: '/works/OL1', title: 'Dune'},
                {olid: '/works/OL2', title: 'Emma'},
            ],
        })
        expect(unfinishedHistoryForCurrent(club).map((row) => row.olid)).toEqual(['/works/OL1'])
    })

    it('is empty when the current book has not been rated or noted', () => {
        const club = state({
            current: {olid: '/works/OL1', title: 'Dune'},
            history: [{olid: '/works/OL2', title: 'Emma'}],
        })
        expect(unfinishedHistoryForCurrent(club)).toEqual([])
    })

    it('builds the same history document id the store writes', () => {
        expect(historyDocId('/works/OL82563W')).toBe('book-_works_OL82563W')
    })

    it('treats an abandoned current book as unknown once its history is gone', () => {
        const abandoned = state({
            current: null,
            history: [{olid: '/works/OL2', title: 'Emma'}],
        })
        expect(clubBookStatus(abandoned, {olid: '/works/OL1', title: 'Dune'})).toBeNull()
        expect(clubBookStatus(abandoned, {olid: '/works/OL2', title: 'Emma'})).toBe('history')
    })
})

describe('pastHistoryBooks', () => {
    it('omits the current book and keeps earlier reads', () => {
        const club = state({
            current: {olid: '/works/OL1', title: 'Dune'},
            history: [
                {olid: '/works/OL1', title: 'Dune'},
                {olid: '/works/OL2', title: 'Emma'},
            ],
        })
        expect(pastHistoryBooks(club).map((row) => row.title)).toEqual(['Emma'])
    })
})

describe('groupRatingLabel', () => {
    it('averages club ratings', () => {
        expect(groupRatingLabel({})).toBe('No ratings yet')
        expect(groupRatingLabel({a: 5, b: 3})).toBe('4.0/5 · 2 ratings')
        expect(groupRatingLabel({a: 4})).toBe('4.0/5 · 1 rating')
    })
})
