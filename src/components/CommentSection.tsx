import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { formatCommentTime } from '../lib/comments'
import { Button, TextArea } from './ui'

export type CommentItem = {
  id: string
  name: string
  text: string
  at: number
}

function commentsLabel(count: number): string {
  if (count === 0) return 'Comments'
  if (count === 1) return 'Comments · 1'
  return `Comments · ${count}`
}

/**
 * Card entry that opens a modal for club comments (newest first) + compose.
 * Keeps the book card uncluttered.
 */
export function CommentSection({
  comments,
  onSave,
  onError,
  ariaLabel = 'Add a comment',
  bookTitle,
  actions,
}: {
  comments: CommentItem[]
  onSave: (text: string) => Promise<void>
  onError?: (err: unknown) => void
  ariaLabel?: string
  bookTitle?: string
  /** Extra actions shown on the card next to the Comments button (e.g. Change book). */
  actions?: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {commentsLabel(comments.length)}
      </Button>
      {actions}
      {open ? (
        <CommentsModal
          comments={comments}
          bookTitle={bookTitle}
          ariaLabel={ariaLabel}
          onClose={() => setOpen(false)}
          onSave={onSave}
          onError={onError}
        />
      ) : null}
    </div>
  )
}

function CommentsModal({
  comments,
  bookTitle,
  ariaLabel,
  onClose,
  onSave,
  onError,
}: {
  comments: CommentItem[]
  bookTitle?: string
  ariaLabel: string
  onClose: () => void
  onSave: (text: string) => Promise<void>
  onError?: (err: unknown) => void
}) {
  const titleId = useId()
  const listId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const clearTimer = useRef<number | null>(null)
  const canSubmit = draft.trim().length > 0 && !busy

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
      if (clearTimer.current != null) window.clearTimeout(clearTimer.current)
    }
  }, [onClose])

  async function handleSave() {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    setStatus('saving')
    try {
      await onSave(text)
      setDraft('')
      setStatus('saved')
      if (clearTimer.current != null) window.clearTimeout(clearTimer.current)
      clearTimer.current = window.setTimeout(() => setStatus('idle'), 2500)
    } catch (err) {
      setStatus('idle')
      onError?.(err)
    } finally {
      setBusy(false)
    }
  }

  const heading = bookTitle ? `Comments · ${bookTitle}` : 'Comments'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col rounded-t-2xl border border-rule/90 bg-paper shadow-[var(--shadow-lift)] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-rule/70 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-xl leading-tight tracking-tight">
              {heading}
            </h2>
            <p className="mt-0.5 text-xs text-ink/55">{commentsLabel(comments.length)}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close comments"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/60 transition hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink/55">No comments yet. Be the first.</p>
          ) : (
            <ul id={listId} className="flex flex-col gap-2.5">
              {comments.map((row) => {
                const when = formatCommentTime(row.at)
                return (
                  <li
                    key={row.id}
                    className="rounded-xl border border-rule/50 bg-cream/90 px-3.5 py-2.5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-xs font-semibold text-ink/70">{row.name}</p>
                      {when ? (
                        <time
                          dateTime={new Date(row.at).toISOString()}
                          className="text-[11px] tabular-nums text-ink/45"
                        >
                          {when}
                        </time>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-ink">
                      {row.text}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-rule/70 px-4 py-3 sm:px-5">
          <TextArea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (status === 'saved') setStatus('idle')
            }}
            placeholder="Write a comment"
            aria-label={ariaLabel}
            className="min-h-24"
          />
          <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
            {status !== 'idle' ? (
              <p role="status" aria-live="polite" className="mr-auto text-xs text-ink/60">
                {status === 'saving' ? 'Saving…' : 'Saved.'}
              </p>
            ) : (
              <span className="mr-auto" />
            )}
            <Button type="button" size="sm" disabled={!canSubmit} onClick={() => void handleSave()}>
              Add comment
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
