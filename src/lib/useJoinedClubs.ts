import { useEffect, useState } from 'react'
import type { JoinedClub } from '../types'
import { friendlyFirebaseError } from './errors'
import { subscribeJoinedClubs } from './store'

type Snapshot = {
  uid: string
  clubs: JoinedClub[]
  error: string | null
}

export function useJoinedClubs(uid: string | null) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)

  useEffect(() => {
    if (!uid) return
    return subscribeJoinedClubs(
      uid,
      (rows) => setSnapshot({ uid, clubs: rows, error: null }),
      (err) =>
        setSnapshot({
          uid,
          clubs: [],
          error: friendlyFirebaseError(err),
        }),
    )
  }, [uid])

  if (!uid) return { clubs: [] as JoinedClub[], ready: true, error: null }
  if (snapshot?.uid !== uid) return { clubs: [] as JoinedClub[], ready: false, error: null }
  return { clubs: snapshot.clubs, ready: true, error: snapshot.error }
}
