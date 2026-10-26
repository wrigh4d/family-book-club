import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { friendlyFirebaseError } from '../lib/errors'
import { useClub } from '../lib/useClub'
import {
  AccentRule,
  Brand,
  Button,
  Card,
  ErrorBanner,
  GoogleSignInCard,
  LoadingState,
  NameForm,
  Page,
  TextButton,
} from './ui'

/** Shown instead of an empty club page while sign-in, a name, or the club snapshot is missing. */
export function ClubEntry() {
  const {
    uid,
    displayName,
    suggestedName,
    ready,
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
        <LoadingState label="Getting you in…" />
      </Page>
    )
  }

  if (!uid) {
    return (
      <Page>
        <header className="flex flex-col gap-3">
          <div>
            <Brand />
            <h1 className="font-display text-3xl">Join this club</h1>
          </div>
          <AccentRule />
        </header>
        <ErrorBanner message={error} />
        <GoogleSignInCard onSignIn={() => void handleGoogle()} busy={authBusy} />
      </Page>
    )
  }

  if (!displayName) {
    return (
      <Page>
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-3xl">Join this club</h1>
          <AccentRule />
        </header>
        <ErrorBanner message={error} />
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

  return (
    <Page>
      <LoadingState label="Loading club…" />
      <ErrorBanner message={error} />
      {error ? (
        <Button variant="ghost" onClick={() => navigate('/clubs')}>
          My clubs
        </Button>
      ) : null}
    </Page>
  )
}
