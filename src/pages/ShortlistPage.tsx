import {Link, Navigate, useNavigate, useParams} from 'react-router-dom'
import {Nominate, Shortlist} from '../components/shortlistTools'
import {Brand, Button, ErrorBanner, Page} from '../components/ui'
import {friendlyFirebaseError} from '../lib/errors'
import {addNomination, resolveCurrentBook, toggleAlreadyRead} from '../lib/store'
import {useClub} from '../lib/useClub'

export function ShortlistPage() {
    const {code: rawCode = ''} = useParams()
    const {code, uid, displayName, ready, state, error, setError} = useClub(rawCode)
    const navigate = useNavigate()

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

    return (
        <Page>
            <header className="flex flex-col gap-2">
                <Brand/>
                <h1 className="font-display text-3xl">Shortlist</h1>
                <p className="text-sm text-ink/70">{state.club.name}</p>
                <Link className="text-sm font-semibold text-burgundy underline" to={`/club/${code}`}>
                    Back to club
                </Link>
            </header>
            <ErrorBanner message={error}/>
            <Nominate
                existingOlids={state.nominations.map((book) => book.olid)}
                onAdd={async (hit) => {
                    try {
                        await addNomination(code, uid, displayName, hit)
                    } catch (err) {
                        setError(friendlyFirebaseError(err))
                    }
                }}
            />
            <Shortlist
                books={state.nominations}
                uid={uid}
                onFlag={async (id, already) => {
                    try {
                        await toggleAlreadyRead(code, id, uid, already)
                    } catch (err) {
                        setError(friendlyFirebaseError(err))
                    }
                }}
            />
        </Page>
    )
}
