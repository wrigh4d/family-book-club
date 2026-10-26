import { useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ClubEntry } from '../components/ClubEntry'
import { AccountMenu, ClubSectionNav, ClubTabBar, type ClubSection } from '../components/clubNav'
import { useAuth } from '../lib/auth'
import { useChatUnread } from '../lib/useChatUnread'
import { Button, ClubHeader, ErrorBanner, Page } from '../components/ui'
import { ClubProvider, useClub } from '../lib/useClub'

export function ClubLayout() {
  return (
    <ClubProvider>
      <ClubGate />
    </ClubProvider>
  )
}

function ClubGate() {
  const { code, uid, displayName, ready, state } = useClub()
  const navigate = useNavigate()

  if (!code) {
    return (
      <Page>
        <ErrorBanner message="Invalid club link." />
        <Button onClick={() => navigate('/clubs')}>Back to My Clubs</Button>
      </Page>
    )
  }

  if (!ready || !uid || !displayName || !state) return <ClubEntry />

  return <Outlet />
}

const CLUB_SECTIONS: {
  id: ClubSection['id']
  label: string
  tab: string
  icon: ClubSection['icon']
}[] = [
  { id: 'club', label: 'Club', tab: 'Club', icon: 'book' },
  { id: 'shortlist', label: 'Shortlist', tab: 'Shortlist', icon: 'bookmark' },
  { id: 'history', label: 'Past books', tab: 'Past', icon: 'shelf' },
  { id: 'chat', label: 'Chat', tab: 'Chat', icon: 'chat' },
]

function useClubSections(code: string): ClubSection[] {
  const { pathname } = useLocation()
  const { uid } = useAuth()
  const chatUnread = useChatUnread(code, uid, pathname)
  return CLUB_SECTIONS.map((item) => {
    const to = item.id === 'club' ? `/club/${code}` : `/club/${code}/${item.id}`
    return {
      ...item,
      to,
      active: pathname === to,
      unread: item.id === 'chat' && chatUnread,
    }
  })
}

export function ClubShell() {
  const { code, uid, displayName, state, signOut } = useClub()
  const sections = useClubSections(code)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    if (pathname === `/club/${code}/chat`) return
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname, code])

  if (!uid || !displayName || !state) return <ClubEntry />

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="flex h-dvh flex-col bg-transparent text-ink pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="relative z-20 shrink-0 bg-cream/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto w-full max-w-5xl px-4 pt-4 md:px-6 md:pt-6">
          <ClubHeader
            name={state.club.name}
            action={<AccountMenu name={displayName} onSignOut={() => void handleSignOut()} />}
          />
          <ClubSectionNav items={sections} className="mt-4" />
        </div>
      </header>
      <main id="main" tabIndex={-1} ref={mainRef} className="min-h-0 flex-1 overflow-y-auto outline-none overscroll-y-contain">
        <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </div>
      </main>
      <ClubTabBar items={sections} />
    </div>
  )
}
