import { describe, expect, it } from 'vitest'
import { genreLean, scoreNominations } from './suggestion'
import type { HistoryBook, Nomination } from '../types'

function nom(partial: Partial<Nomination> & Pick<Nomination, 'id' | 'genre'>): Nomination {
  return {
    olid: partial.id,
    title: partial.title ?? partial.id,
    author: 'Author',
    coverUrl: null,
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
        nom({ id: 'nf', genre: 'Non-fiction', createdAt: 1 }),
        nom({ id: 'fan', genre: 'Fantasy', createdAt: 2 }),
      ],
      { a: ['Fantasy'], b: ['Fantasy'], c: ['Mystery'] },
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
        ratings: { a: 5, b: 5 },
      },
    ]
    const ranked = scoreNominations(
      [
        nom({ id: 'nf', genre: 'Non-fiction' }),
        nom({ id: 'fan', genre: 'Fantasy' }),
      ],
      { a: ['Fantasy', 'Non-fiction'], b: ['Fantasy', 'Non-fiction'] },
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
        nom({ id: 'fresh', genre: 'Fantasy', createdAt: 2 }),
      ],
      { a: ['Fantasy'] },
      [],
    )
    expect(ranked[0]?.id).toBe('fresh')
    expect(ranked[1]?.id).toBe('read')
  })

  it('breaks ties with the earlier nomination', () => {
    const ranked = scoreNominations(
      [
        nom({ id: 'later', genre: 'Fantasy', createdAt: 20 }),
        nom({ id: 'earlier', genre: 'Fantasy', createdAt: 10 }),
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
    expect(lean[0]).toEqual({ genre: 'Fantasy', count: 2 })
    expect(lean[1]).toEqual({ genre: 'Mystery', count: 1 })
  })
})
