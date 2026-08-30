import {useEffect} from 'react'
import {Link, Navigate, useNavigate, useParams} from 'react-router-dom'
import {Nominate, Shortlist} from '../components/shortlistTools'
import {Brand, Button, buttonClass, Card, CardTitle, ClubHeader, ErrorBanner, Page} from '../components/ui'
import {friendlyFirebaseError} from '../lib/errors'
import {availableShortlist} from '../lib/bookStatus'
import {addNomination, pruneShortlist, removeFromShortlist, resolveCurrentBook, toggleAlreadyRead} from '../lib/store'
import {useClub} from '../lib/useClub'

export function ShortlistPage() {
    const {code: rawCode = ''} = useParams()
    const {code, uid, displayName, ready, state, error, setError} = useClub(rawCode)
    const navigate = useNavigate()

    useEffect(() => {
        if (!state) return
        pruneShortlist(code, state).catch(() => undefined)
    }, [code, state])

    if (!ready) {
        return (
            <Page>
                <p>Getting you in…</p>
            </Page>
        )
    }

    if (!displayName) {
        return (
            <Page>
                <Brand/>
                <p>Join the club from the home page first.</p>
                <Button variant="ghost" onClick={() => navigate(`/club/${code}`)}>
                    Back to club
                </Button>
            </Page>
        )
    }

    if (!state || !uid) {
        return (
            <Page>
                <Brand/>
                <p>{error ?? 'Loading shortlist…'}</p>
            </Page>
        )
    }

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
