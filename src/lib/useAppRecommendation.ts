import {meetingRecsFromRound} from './recs'
import type {AppRecommendation, ClubState} from '../types'

export function useAppRecommendations(state: ClubState | null): {
    genre: AppRecommendation | null
    ratings: AppRecommendation | null
    genreLoading: boolean
    ratingsLoading: boolean
} {
    const recs = meetingRecsFromRound(state)
    return {
        genre: recs.genre,
        ratings: recs.ratings,
        genreLoading: false,
        ratingsLoading: false,
    }
}
