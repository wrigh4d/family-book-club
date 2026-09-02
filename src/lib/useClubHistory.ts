import {useEffect, useState} from 'react'
import type {HistoryBook} from '../types'
import {friendlyFirebaseError} from './errors'
import {subscribeClubHistory} from './store'

type Snapshot = {
    code: string
    books: HistoryBook[]
    error: string | null
}

export function useClubHistory(code: string | null) {
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null)

    useEffect(() => {
        if (!code) return
        return subscribeClubHistory(
            code,
            (books) => setSnapshot({code, books, error: null}),
            (err) =>
                setSnapshot({
                    code,
                    books: [],
                    error: friendlyFirebaseError(err),
                }),
        )
    }, [code])

    if (!code) return {books: [] as HistoryBook[], ready: true, error: null}
    if (snapshot?.code !== code) return {books: [] as HistoryBook[], ready: false, error: null}
    return {books: snapshot.books, ready: true, error: snapshot.error}
}
