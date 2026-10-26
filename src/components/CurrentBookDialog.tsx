import { useEffect, useId, useRef } from 'react'
import type { CurrentBook } from '../types'
import { useWorkDescription } from '../lib/useWorkDescription'
import { Cover } from './ui'

export function CurrentBookDialog({
  book,
  onClose,
}: {
  book: CurrentBook
  onClose: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const description = useWorkDescription(book.olid)
  const paragraphs = description
    ? description
        .split(/\r?\n\r?\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
    : []

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-paper p-6 shadow-[var(--shadow-lift)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-end">
          <button
            ref={closeRef}
            type="button"
            aria-label="Close book details"
            className="text-2xl leading-none text-ink/50"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <Cover
          src={book.coverUrl}
          title={book.title}
          loading="eager"
          className="mx-auto h-56 w-36 shadow-md ring-1 ring-gold/40"
        />
        <h2 id={titleId} className="mt-4 text-center font-display text-3xl leading-tight">
          {book.title}
        </h2>
        <p className="mt-1 text-center text-sm text-ink/70">{book.author}</p>
        <dl className="mt-5 grid grid-cols-3 gap-2 border-y border-rule py-3 text-center">
          <Fact label="Year" value={book.firstPublishYear ? String(book.firstPublishYear) : '—'} />
          <Fact label="Pages" value={book.pageCount ? String(book.pageCount) : '—'} />
          <Fact label="Genre" value={book.genre} />
        </dl>
        {paragraphs.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-base leading-relaxed whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-ink/50 uppercase">{label}</dt>
      <dd className="font-display text-lg">{value}</dd>
    </div>
  )
}
