import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Nominate, Shortlist } from '../components/shortlistTools'
import { Card, CardTitle, ErrorBanner } from '../components/ui'
import { friendlyFirebaseError } from '../lib/errors'
import { availableShortlist, staleShortlist } from '../lib/bookStatus'
import {
  addNomination,
  pruneShortlist,
  removeFromShortlist,
  resolveCurrentBook,
  toggleAlreadyRead,
} from '../lib/store'
import { useClub } from '../lib/useClub'
import { useFinishedCatalog } from '../lib/useClubHistory'

export function ShortlistPage() {
  const { code, uid, displayName, state, error, setError } = useClub()
  const catalog = useFinishedCatalog(code, state)
  const viewed = catalog ?? state

  const staleKey = viewed
    ? staleShortlist(viewed)
        .map((book) => book.id)
        .sort()
        .join(',')
    : ''

  useEffect(() => {
    if (!viewed || !staleKey) return
    pruneShortlist(code, viewed).catch(() => undefined)
  }, [code, staleKey, viewed])

  if (!uid || !displayName || !viewed) return null

  if (!resolveCurrentBook(viewed)) {
    return <Navigate to={`/club/${code}`} replace />
  }

  const listed = availableShortlist(viewed)

  return (
    <>
      <ErrorBanner message={error} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <CardTitle>Add a book</CardTitle>
          <Nominate
            state={viewed}
            onAdd={async (hit) => {
              try {
                await addNomination(code, uid, displayName, hit, viewed)
              } catch (err) {
                setError(friendlyFirebaseError(err))
              }
            }}
            onRemove={async (id) => {
              try {
                await removeFromShortlist(code, id)
              } catch (err) {
                setError(friendlyFirebaseError(err))
              }
            }}
          />
        </Card>
        <Card className="flex flex-col gap-4">
          <CardTitle>Shortlist</CardTitle>
          <Shortlist
            books={listed}
            uid={uid}
            onFlag={async (id, already) => {
              try {
                await toggleAlreadyRead(code, id, uid, already)
              } catch (err) {
                setError(friendlyFirebaseError(err))
              }
            }}
            onRemove={async (id) => {
              try {
                await removeFromShortlist(code, id)
              } catch (err) {
                setError(friendlyFirebaseError(err))
              }
            }}
          />
        </Card>
      </div>
    </>
  )
}
