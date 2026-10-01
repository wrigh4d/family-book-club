import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClubList } from '../components/ClubList'
import { InstallHint } from '../components/InstallHint'
import {
  Brand,
  Button,
  buttonClass,
  Card,
  ErrorBanner,
  Field,
  GoogleSignInCard,
  LoadingState,
  NameForm,
  Page,
  TextButton,
  TextInput,
} from '../components/ui'
import { useAuth } from '../lib/auth'
import { normalizeClubCode } from '../lib/codes'
import { friendlyFirebaseError } from '../lib/errors'
import { createClub, joinClub } from '../lib/store'
import { useJoinedClubs } from '../lib/useJoinedClubs'

export function Landing() {
  const {
    uid,
    displayName,
    suggestedName,
    ready,
    error,
    setDisplayName,
    signInWithGoogle,
    signOut,
  } = useAuth()
  const navigate = useNavigate()
  const {
    clubs,
    ready: clubsReady,
    error: clubsError,
  } = useJoinedClubs(uid && displayName ? uid : null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleGoogle() {
    setLocalError(null)
    setBusy(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setLocalError(friendlyFirebaseError(err))
    } finally {
      setBusy(false)
    }
  }

  async function withName(action: (name: string) => Promise<void>, name?: string) {
    if (!uid) return
    setLocalError(null)
    setBusy(true)
    try {
      const resolved = (name ?? displayName ?? '').trim()
      if (!resolved) throw new Error('Enter your name first.')
      if (!displayName) await setDisplayName(resolved)
      await action(resolved)
    } catch (err) {
      setLocalError(friendlyFirebaseError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const clubName = String(data.get('clubName') ?? '')
    await withName(async (name) => {
      if (!uid) return
      const code = await createClub(clubName, uid, name)
      navigate(`/club/${code}`)
    })
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const code = normalizeClubCode(String(data.get('code') ?? ''))
    if (code.length < 4) {
      setLocalError('Enter the club code.')
      return
    }
    await withName(async (name) => {
      if (!uid) return
      await joinClub(code, uid, name)
      navigate(`/club/${code}`)
    })
  }

  const board = Boolean(ready && uid && displayName)

  return (
    <Page width={board ? 'wide' : 'narrow'}>
      <header className="flex flex-col gap-2">
        {ready && !uid ? <Brand /> : null}
        <h1 className="font-display text-4xl leading-[1.1] tracking-tight">
          Your club. Your next book.
        </h1>
        <p className="max-w-md text-ink/70">
          Share a code, nominate picks, and choose together when you meet.
        </p>
      </header>

      <ErrorBanner message={localError ?? clubsError ?? error} />
      <InstallHint />

      {!ready ? (
        <LoadingState label="Getting you in…" />
      ) : !uid ? (
        <GoogleSignInCard onSignIn={() => void handleGoogle()} busy={busy} />
      ) : !displayName ? (
        <>
          <p className="text-sm text-ink/70">
            Signed in with Google
            {' · '}
            <TextButton onClick={() => void signOut()}>Sign out</TextButton>
          </p>
          <Card>
            <h2 className="mb-3 font-display text-2xl tracking-tight">What should we call you?</h2>
            <NameForm
              defaultName={suggestedName ?? ''}
              onSave={(name) => withName(async () => undefined, name)}
            />
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <h2 className="mb-3 font-display text-2xl tracking-tight">Your clubs</h2>
            {!clubsReady ? (
              <LoadingState label="Loading your clubs…" />
            ) : (
              <div className="flex flex-col gap-3">
                <ClubList clubs={clubs} empty="Create or join a club to get started." />
                <Link className={`${buttonClass('secondary')} sm:self-start`} to="/clubs">
                  {clubs.length > 0 ? 'See all clubs' : 'Go to your clubs'}
                </Link>
              </div>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-2xl tracking-tight">Create</h2>
            <form className="flex flex-col gap-3" onSubmit={handleCreate}>
              <Field label="Club name">
                <TextInput name="clubName" placeholder="Sunday readers" required maxLength={80} />
              </Field>
              <Button type="submit" disabled={busy}>
                Create club
              </Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 font-display text-2xl tracking-tight">Join</h2>
            <form className="flex flex-col gap-3" onSubmit={handleJoin}>
              <Field label="Club code">
                <TextInput
                  name="code"
                  placeholder="AB3K7Q"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
              </Field>
              <Button type="submit" variant="secondary" disabled={busy}>
                Join
              </Button>
            </form>
          </Card>
        </div>
      )}
    </Page>
  )
}
