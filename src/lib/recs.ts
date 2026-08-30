import {bookMatchingTags, isSameRecommendedBook, popularBookInGenre} from './openLibrary'
import {
    appRecommendationWhy,
    ratingsRecommendationWhy,
    splitTagTaste,
    tagTasteFromHistory,
    topWantedGenre,
} from './suggestion'
import type {AppRecommendation, ClubState} from '../types'

function excludeList(state: ClubState): Array<{ olid: string; title: string }> {
    const current = state.club.currentBook
    return [
        ...state.nominations.map((book) => ({olid: book.olid, title: book.title})),
        ...state.history.map((book) => ({olid: book.olid, title: book.title})),
        ...state.club.dislikedRecs,
        ...(current ? [{olid: current.olid, title: current.title}] : []),
    ]
}

function excludeOlids(state: ClubState): string[] {
    return excludeList(state)
        .map((row) => row.olid)
        .filter(Boolean)
}

export async function computeMeetingRecs(
    state: ClubState,
): Promise<{ genre: AppRecommendation | null; ratings: AppRecommendation | null }> {
    const disliked = excludeList(state)
    const olids = excludeOlids(state)
    const wanted = topWantedGenre(state.genreVotes)
    const {loved, avoided} = splitTagTaste(tagTasteFromHistory(state.history))

    let genre: AppRecommendation | null = null
    if (wanted) {
        const hit = await popularBookInGenre(wanted.genre, olids, disliked)
        if (hit && !isSameRecommendedBook(hit, disliked)) {
            genre = {
                ...hit,
                genre: wanted.genre,
                source: 'genre',
                why: appRecommendationWhy(wanted.genre, wanted.count, wanted.voterCount),
            }
        }
    }

    let ratings: AppRecommendation | null = null
    if (loved.length) {
        const extra = genre ? [...olids, genre.olid] : olids
        const extraDisliked = genre ? [...disliked, genre] : disliked
        const hit = await bookMatchingTags(
            loved.map((row) => row.tag),
            avoided.map((row) => row.tag),
            extra,
            extraDisliked,
        )
        if (hit && !isSameRecommendedBook(hit, extraDisliked)) {
            ratings = {
                ...hit,
                genre: loved[0]?.tag ?? 'Fiction',
                source: 'ratings',
                why: ratingsRecommendationWhy(loved, avoided),
            }
        }
    }

    return {genre, ratings}
}

export function meetingRecsFromRound(state: ClubState | null): {
    genre: AppRecommendation | null
    ratings: AppRecommendation | null
} {
    if (!state?.round) return {genre: null, ratings: null}
    const genre =
        state.round.genreRecommendation ??
        state.round.suggestion?.genreRecommendation ??
        state.round.suggestion?.appRecommendation ??
        null
    const ratings =
        state.round.ratingsRecommendation ?? state.round.suggestion?.ratingsRecommendation ?? null
    return {
        genre: genre ? {...genre, source: 'genre'} : null,
        ratings: ratings ? {...ratings, source: 'ratings'} : null,
    }
}
