import {Navigate, useNavigate} from 'react-router-dom'
import {ClubList} from '../components/ClubList'
import {Brand, Button, Card, ErrorBanner, Page, SessionBar} from '../components/ui'
import {useAuth} from '../lib/auth'
import {useJoinedClubs} from '../lib/useJoinedClubs'

export function MyClubs() {
    const {uid, displayName, ready, error, signOut} = useAuth()
    const {clubs, ready: clubsReady, error: clubsError} = useJoinedClubs(
        uid && displayName ? uid : null,
    )
    const navigate = useNavigate()

    async function handleSignOut() {
        await signOut()
        navigate('/')
    }

    if (!ready) {
        return (
            <Page>
                <p>Getting you in…</p>
            </Page>
        )
    }

    if (!uid || !displayName) {
        return <Navigate to="/" replace/>
    }

    return (
        <Page>
            <header className="flex flex-col gap-2">
                <Brand/>
                <h1 className="font-display text-4xl leading-tight">Your clubs</h1>
                <p className="text-ink/80">Open a club you’ve created or joined.</p>
            </header>
            <SessionBar name={displayName} onSignOut={() => void handleSignOut()} clubsHref={null}/>
            <ErrorBanner message={clubsError ?? error}/>
            <Card>
                {!clubsReady ? (
                    <p className="text-sm text-ink/70">Loading your clubs…</p>
                ) : (
                    <ClubList
                        clubs={clubs}
                        empty="You haven’t joined a club yet. Create one or enter a code on the home page."
                    />
                )}
            </Card>
            <Button type="button" variant="ghost" onClick={() => navigate('/')}>
                Create or join another club
            </Button>
        </Page>
    )
}
