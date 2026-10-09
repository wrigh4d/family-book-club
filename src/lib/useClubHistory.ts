import { useEffect, useMemo, useState } from 'react'
import type { ClubState, HistoryBook } from '../types'
import { withFinishedCatalog } from './bookStatus'
import { friendlyFirebaseError } from './errors'
import { subscribeClubHistory } from './store'

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
      (books) => setSnapshot({ code, books, error: null }),
      (err) =>
        setSnapshot({
          code,
          books: [],
          error: friendlyFirebaseError(err),
        }),
    )
  }, [code])

  if (!code) return { books: [] as HistoryBook[], ready: true, error: null }
  if (snapshot?.code !== code) return { books: [] as HistoryBook[], ready: false, error: null }
  return { books: snapshot.books, ready: true, error: snapshot.error }
}

/** Meeting, shortlist, and conclude read the finished catalog. Pass the live snapshot to the current-book card. */
export function useFinishedCatalog(code: string | null, live: ClubState | null): ClubState | null {
  const history = useClubHistory(live && code ? code : null)
  const { books, ready } = history
  return useMemo(() => {
    if (!live) return null
    if (!ready) return live
    return withFinishedCatalog(live, books)
  }, [live, ready, books])
}
