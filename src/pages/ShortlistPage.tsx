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
  const { catalog, error: historyError } = useFinishedCatalog(code, state)

  const staleKey = catalog
    ? staleShortlist(catalog)
        .map((book) => book.id)
        .sort()
        .join(',')
    : ''

  useEffect(() => {
    if (!catalog || !staleKey) return
    pruneShortlist(code, catalog).catch(() => undefined)
  }, [code, staleKey, catalog])

  if (!uid || !displayName || !state) return null

  if (!resolveCurrentBook(state)) {
    return <Navigate to={`/club/${code}`} replace />
  }

  if (!catalog) {
    return (
      <>
        <ErrorBanner message={historyError ?? error} />
        <Card className="flex flex-col gap-3">
          <CardTitle>Shortlist</CardTitle>
          <p className="text-sm text-ink/70">
            {historyError
              ? 'Finished books didn’t load, so a past book can’t be added yet.'
              : 'Still loading the club’s finished books.'}
          </p>
        </Card>
      </>
    )
  }

  const listed = availableShortlist(catalog)

  return (
    <>
      <ErrorBanner message={historyError ?? error} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <CardTitle>Add a book</CardTitle>
          <Nominate
            state={catalog}
            onAdd={async (hit) => {
              try {
                await addNomination(code, uid, displayName, hit, catalog)
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
