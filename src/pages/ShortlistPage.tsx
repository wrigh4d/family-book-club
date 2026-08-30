import {useEffect} from 'react'
import {Link, Navigate} from 'react-router-dom'
import {Nominate, Shortlist} from '../components/shortlistTools'
import {buttonClass, Card, CardTitle, ClubHeader, ErrorBanner, Page} from '../components/ui'
import {friendlyFirebaseError} from '../lib/errors'
import {availableShortlist, staleShortlist} from '../lib/bookStatus'
import {addNomination, pruneShortlist, removeFromShortlist, resolveCurrentBook, toggleAlreadyRead} from '../lib/store'
import {useClub} from '../lib/useClub'

export function ShortlistPage() {
    const {code, uid, displayName, state, error, setError} = useClub()
    const staleKey = state
        ? staleShortlist(state)
              .map((book) => book.id)
              .sort()
              .join(',')
        : ''

    useEffect(() => {
        if (!state || !staleKey) return
        pruneShortlist(code, state).catch(() => undefined)
    }, [code, staleKey, state])

    if (!uid || !displayName || !state) return null

    if (!resolveCurrentBook(state)) {
        return <Navigate to={`/club/${code}`} replace/>
    }

    const listed = availableShortlist(state)

    return (
        <Page>
            <ClubHeader
                name={state.club.name}
                action={
                    <Link className={`${buttonClass('ghost')} whitespace-nowrap`} to={`/club/${code}`}>
                        Back to club
                    </Link>
                }
            />
            <ErrorBanner message={error}/>
            <Nominate
                state={state}
                onAdd={async (hit) => {
                    try {
                        await addNomination(code, uid, displayName, hit, state)
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
            <Card className="flex flex-col gap-4">
                <CardTitle>Short list</CardTitle>
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
        </Page>
    )
}
