import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PrototypeSwitcher, type PrototypeVariant } from '../components/PrototypeSwitcher'
import { Cover } from '../components/ui'

// Three variants of the current book dialog, switchable via ?variant=,
// on /prototype/current-book-dialog. Sample book, no sign-in. PROTOTYPE, throwaway.

const VARIANTS: PrototypeVariant[] = [
  { id: 'A', name: 'Bottom sheet' },
  { id: 'B', name: 'Centered cover' },
  { id: 'C', name: 'Reading page' },
]

const book = {
  title: 'The Hobbit',
  author: 'J.R.R. Tolkien',
  year: 1937,
  pages: 310,
  genre: 'Fantasy',
  coverUrl: 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg',
  description:
    'Bilbo Baggins would rather stay in his hobbit-hole. Gandalf and thirteen dwarves send him toward the Lonely Mountain anyway. The road runs through trolls, goblins, a riddle game in the dark, and a dragon asleep on a pile of gold. He comes home with a small treasure and a very different idea of a quiet life.',
}

type DialogProps = {
  description: string | null
  onClose: () => void
}

export default function CurrentBookDialogPrototype() {
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(true)
  const variant = params.get('variant') ?? 'A'
  const description = params.get('desc') === '0' ? null : book.description

  function toggleDescription() {
    const next = new URLSearchParams(params)
    if (description) next.set('desc', '0')
    else next.delete('desc')
    setParams(next, { replace: true })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 px-4 py-8 pb-28">
      <p className="text-xs font-semibold tracking-wide text-burgundy uppercase">
        Prototype · dialog {open ? 'open' : 'closed'} · description {description ? 'present' : 'missing'}
      </p>
      <section className="flex flex-col gap-4 rounded-2xl border border-rule/90 bg-paper p-5 shadow-[var(--shadow-card)]">
        <h1 className="font-display text-xl leading-tight">Current book</h1>
        <div className="flex gap-4">
          <button type="button" className="shrink-0 rounded-lg" onClick={() => setOpen(true)}>
            <Cover
              src={book.coverUrl}
              title={book.title}
              loading="eager"
              className="h-36 w-24 shadow-md ring-1 ring-gold/35"
            />
          </button>
          <div>
            <button
              type="button"
              className="text-left font-display text-2xl leading-tight"
              onClick={() => setOpen(true)}
            >
              {book.title}
            </button>
            <p className="text-sm text-ink/70">{book.author}</p>
            <p className="mt-1 text-sm text-ink/60">
              {book.year} · {book.pages} pages
            </p>
            <p className="mt-2 text-sm font-semibold text-burgundy">Room rating 4.0</p>
          </div>
        </div>
        <p className="text-sm text-ink/55">Rating, comment, and change book stay on this card.</p>
      </section>
      <button
        type="button"
        className="self-start rounded-full border border-ink/20 px-3 py-2 text-sm font-semibold"
        onClick={toggleDescription}
      >
        {description ? 'Hide description' : 'Show description'}
      </button>
      {open && variant === 'B' ? (
        <CenteredCover description={description} onClose={() => setOpen(false)} />
      ) : null}
      {open && variant === 'C' ? (
        <ReadingPage description={description} onClose={() => setOpen(false)} />
      ) : null}
      {open && variant !== 'B' && variant !== 'C' ? (
        <BottomSheet description={description} onClose={() => setOpen(false)} />
      ) : null}
      <PrototypeSwitcher variants={VARIANTS} />
    </main>
  )
}

function BottomSheet({ description, onClose }: DialogProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-paper pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-lift)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-10 rounded-full bg-rule" />
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Cover src={book.coverUrl} title={book.title} className="h-16 w-11" />
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="font-display text-xl leading-tight">
              {book.title}
            </h2>
            <p className="text-sm text-ink/70">{book.author}</p>
          </div>
          <button type="button" className="px-2 text-sm font-semibold text-burgundy" onClick={onClose}>
            Close
          </button>
        </div>
        {description ? (
          <div className="overflow-y-auto px-4 pb-4">
            <p className="text-base leading-relaxed text-ink/85">{description}</p>
          </div>
        ) : null}
        <p className="border-t border-rule px-4 py-3 text-sm text-ink/70">
          {book.year} · {book.pages} pages · {book.genre}
        </p>
      </div>
    </div>
  )
}

function CenteredCover({ description, onClose }: DialogProps) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/45 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="center-title"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-paper p-6 shadow-[var(--shadow-lift)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-end">
          <button type="button" aria-label="Close" className="text-2xl leading-none text-ink/50" onClick={onClose}>
            ×
          </button>
        </div>
        <Cover
          src={book.coverUrl}
          title={book.title}
          loading="eager"
          className="mx-auto h-56 w-36 shadow-md ring-1 ring-gold/40"
        />
        <h2 id="center-title" className="mt-4 text-center font-display text-3xl leading-tight">
          {book.title}
        </h2>
        <p className="mt-1 text-center text-sm text-ink/70">{book.author}</p>
        <dl className="mt-5 grid grid-cols-3 gap-2 border-y border-rule py-3 text-center">
          <div>
            <dt className="text-xs tracking-wide text-ink/50 uppercase">Year</dt>
            <dd className="font-display text-lg">{book.year}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-ink/50 uppercase">Pages</dt>
            <dd className="font-display text-lg">{book.pages}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-wide text-ink/50 uppercase">Genre</dt>
            <dd className="font-display text-lg">{book.genre}</dd>
          </div>
        </dl>
        {description ? <p className="mt-4 text-base leading-relaxed">{description}</p> : null}
      </div>
    </div>
  )
}

function ReadingPage({ description, onClose }: DialogProps) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-cream" role="dialog" aria-modal="true" aria-labelledby="read-title">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col px-5 py-6">
        <button type="button" className="self-start text-sm font-semibold text-burgundy" onClick={onClose}>
          Back to the club
        </button>
        <p className="mt-8 text-xs font-semibold tracking-wide text-gold uppercase">Current book</p>
        <h2 id="read-title" className="mt-2 font-display text-5xl leading-none tracking-tight">
          {book.title}
        </h2>
        <p className="mt-3 text-lg text-ink/70">{book.author}</p>
        {description ? (
          <p className="mt-8 font-display text-xl leading-relaxed">
            <Cover
              src={book.coverUrl}
              title={book.title}
              className="float-left mr-4 mb-2 h-28 w-20"
            />
            {description}
          </p>
        ) : (
          <Cover src={book.coverUrl} title={book.title} className="mt-8 h-40 w-28" />
        )}
        <p className="mt-auto pt-10 text-sm text-ink/60">
          First published {book.year} · {book.pages} pages · {book.genre}
        </p>
      </div>
    </div>
  )
}
