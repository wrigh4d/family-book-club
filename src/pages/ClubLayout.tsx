import {useState} from 'react'
import {Outlet, useNavigate} from 'react-router-dom'
import {
    AccentRule,
    Brand,
    Button,
    Card,
    ErrorBanner,
    GoogleSignInCard,
    NameForm,
    Page,
    TextButton,
} from '../components/ui'
import {friendlyFirebaseError} from '../lib/errors'
import {ClubProvider, useClub} from '../lib/useClub'

export function ClubLayout() {
    return (
        <ClubProvider>
            <ClubGate/>
        </ClubProvider>
    )
}

function ClubGate() {
    const {
        uid,
        displayName,
        suggestedName,
        ready,
        state,
        error,
        setError,
        setDisplayName,
        signInWithGoogle,
        signOut,
    } = useClub()
    const navigate = useNavigate()
    const [authBusy, setAuthBusy] = useState(false)

    async function handleGoogle() {
        setError(null)
        setAuthBusy(true)
        try {
            await signInWithGoogle()
        } catch (err) {
            setError(friendlyFirebaseError(err))
        } finally {
            setAuthBusy(false)
        }
    }

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

    if (!uid) {
        return (
            <Page>
                <header className="flex flex-col gap-3">
                    <div>
                        <Brand/>
                        <h1 className="font-display text-3xl">Join this club</h1>
                    </div>
                    <AccentRule/>
                </header>
                <ErrorBanner message={error}/>
                <GoogleSignInCard onSignIn={() => void handleGoogle()} busy={authBusy}/>
            </Page>
        )
    }

    if (!displayName) {
        return (
            <Page>
                <header className="flex flex-col gap-3">
                    <div>
                        <Brand/>
                        <h1 className="font-display text-3xl">Join this club</h1>
                    </div>
                    <AccentRule/>
                </header>
                <ErrorBanner message={error}/>
                <p className="text-sm text-ink/70">
                    Signed in with Google
                    {' · '}
                    <TextButton onClick={() => void handleSignOut()}>Sign out</TextButton>
                </p>
                <Card>
                    <NameForm
                        busyLabel="Join club"
                        defaultName={suggestedName ?? ''}
                        onSave={async (name) => {
                            await setDisplayName(name)
                        }}
                    />
                </Card>
            </Page>
        )
    }

    if (!state) {
        return (
            <Page>
                <Brand/>
                <p>Loading club…</p>
                <ErrorBanner message={error}/>
                {error ? (
                    <Button variant="ghost" onClick={() => navigate('/')}>
                        Back
                    </Button>
                ) : null}
            </Page>
        )
    }

    return <Outlet/>
}
