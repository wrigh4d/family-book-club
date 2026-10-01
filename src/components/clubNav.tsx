import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './ui'

type ClubSectionId = 'club' | 'shortlist' | 'history' | 'chat'
type NavIconName = 'book' | 'bookmark' | 'shelf' | 'chat'

export type ClubSection = {
  id: ClubSectionId
  label: string
  tab: string
  icon: NavIconName
  to: string
  active: boolean
  unread: boolean
}

export function AccountMenu({
  name,
  onSignOut,
  clubsHref = '/clubs',
}: {
  name: string
  onSignOut: () => void
  clubsHref?: string | null
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-rule bg-paper py-1 pr-2 pl-1 outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
      >
        <span
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-full bg-burgundy font-display text-sm text-cream"
        >
          {initial}
        </span>
        <span className="hidden max-w-[7rem] truncate text-sm font-semibold sm:inline">{name}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 flex w-44 flex-col gap-2 rounded-xl border border-rule bg-paper p-3 shadow-md"
        >
          {clubsHref ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false)
                navigate(clubsHref)
              }}
            >
              My clubs
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
          >
            Sign out
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function ClubSectionNav({
  items,
  className = '',
}: {
  items: ClubSection[]
  className?: string
}) {
  return (
    <nav aria-label="Club sections" className={`hidden gap-5 md:flex ${className}`}>
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          aria-current={item.active ? 'page' : undefined}
          aria-label={item.unread ? `${item.label}, new messages` : undefined}
          className={`relative pb-1 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy ${
            item.active ? 'text-burgundy' : 'text-ink/55 hover:text-ink'
          }`}
        >
          {item.label}
          {item.unread ? (
            <span
              aria-hidden="true"
              className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gold align-middle"
            />
          ) : null}
          {item.active ? (
            <span
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-burgundy"
            />
          ) : null}
        </Link>
      ))}
    </nav>
  )
}

export function ClubTabBar({ items }: { items: ClubSection[] }) {
  return (
    <nav
      aria-label="Club sections"
      className="grid shrink-0 grid-cols-4 border-t border-rule bg-paper pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          aria-current={item.active ? 'page' : undefined}
          aria-label={item.unread ? `${item.label}, new messages` : item.label}
          className={`flex flex-col items-center gap-1 px-1 text-[11px] font-semibold leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
            item.active ? 'text-burgundy' : 'text-ink/50 hover:text-ink'
          }`}
        >
          <span className="relative">
            <NavIcon name={item.icon} />
            {item.unread ? (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-1.5 h-2 w-2 rounded-full bg-gold ring-2 ring-paper"
              />
            ) : null}
          </span>
          {item.tab}
        </Link>
      ))}
    </nav>
  )
}

function NavIcon({ name }: { name: NavIconName }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'h-5 w-5',
    'aria-hidden': true as const,
  }
  if (name === 'book') {
    return (
      <svg {...common}>
        <path d="M5 5.2A2.2 2.2 0 0 1 7.2 3H19v16H7.2A2.2 2.2 0 0 0 5 21.2V5.2Z" />
        <path d="M5 5.2A2.2 2.2 0 0 1 7.2 7.4H19" />
      </svg>
    )
  }
  if (name === 'bookmark') {
    return (
      <svg {...common}>
        <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.2L6 20V5a1 1 0 0 1 1-1Z" />
      </svg>
    )
  }
  if (name === 'shelf') {
    return (
      <svg {...common}>
        <path d="M5 19V6.5A1.5 1.5 0 0 1 6.5 5H9v14" />
        <path d="M9 19V4.5A1.5 1.5 0 0 1 10.5 3H14v16" />
        <path d="M14 19v-9.5A1.5 1.5 0 0 1 15.5 8H19v11" />
        <path d="M4 19h16" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M7.5 17.2 5 19.2V7.2A2.2 2.2 0 0 1 7.2 5h9.6A2.2 2.2 0 0 1 19 7.2v7.6a2.2 2.2 0 0 1-2.2 2.2H7.5Z" />
    </svg>
  )
}
