import { Navigate, useNavigate } from 'react-router-dom'
import { ClubList } from '../components/ClubList'
import { Button, Card, ErrorBanner, LoadingState, Page } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useJoinedClubs } from '../lib/useJoinedClubs'

export function MyClubs() {
  const { uid, displayName, ready, error } = useAuth()
  const {
    clubs,
    ready: clubsReady,
    error: clubsError,
  } = useJoinedClubs(uid && displayName ? uid : null)
  const navigate = useNavigate()

  if (!ready) {
    return (
      <Page>
        <LoadingState label="Getting you in…" />
      </Page>
    )
  }

  if (!uid || !displayName) {
    return <Navigate to="/" replace />
  }

  return (
    <Page width="wide">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl leading-[1.1] tracking-tight">Your clubs</h1>
        <p className="text-ink/70">Clubs you created or joined.</p>
      </header>
      <ErrorBanner message={clubsError ?? error} />
      <Card>
        {!clubsReady ? (
          <LoadingState label="Loading your clubs…" />
        ) : (
          <ClubList
            clubs={clubs}
            empty="No clubs yet. Create or join one from home."
          />
        )}
      </Card>
      <Button type="button" variant="ghost" className="sm:self-start" onClick={() => navigate('/')}>
        Create or join
      </Button>
    </Page>
  )
}
