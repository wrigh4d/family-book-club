import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { Button, Subhead, TextArea } from './ui'

export type CommentItem = {
  id: string
  name: string
  text: string
}

export function CommentSection({
  comments,
  onSave,
  onError,
  ariaLabel = 'Add a comment',
  tone = 'page',
  actions,
}: {
  comments: CommentItem[]
  onSave: (text: string) => Promise<void>
  onError?: (err: unknown) => void
  ariaLabel?: string
  tone?: 'page' | 'meeting'
  actions?: ReactNode
}) {
  const listId = useId()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [open, setOpen] = useState(false)
  const clearTimer = useRef<number | null>(null)
  const meeting = tone === 'meeting'
  const canSubmit = draft.trim().length > 0 && !busy
  const countLabel =
    comments.length === 0
      ? 'Comments'
      : comments.length === 1
        ? 'Comments · 1'
        : `Comments · ${comments.length}`

  useEffect(() => {
    return () => {
      if (clearTimer.current != null) window.clearTimeout(clearTimer.current)
    }
  }, [])

  async function handleSave() {
    const text = draft.trim()
    if (!text || busy) return
    setBusy(true)
    setStatus('saving')
    try {
      await onSave(text)
      setDraft('')
      setOpen(true)
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

  return (
    <div className="flex flex-col gap-3">
      <div>
        {meeting ? (
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cream">
            <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-gold" />
            Comments
          </p>
        ) : (
          <Subhead>Comments</Subhead>
        )}
        {comments.length === 0 ? (
          <p className={meeting ? 'text-sm text-cream/60' : 'text-sm text-ink/55'}>
            No comments yet.
          </p>
        ) : (
          <details
            className="group"
            open={open}
            onToggle={(event) => setOpen(event.currentTarget.open)}
          >
            <summary
              className={`flex list-none cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold outline-none select-none marker:content-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden ${
                meeting
                  ? 'border-gold/35 bg-burgundy/40 text-cream focus-visible:ring-gold'
                  : 'border-rule/70 bg-cream/90 text-ink/85 focus-visible:ring-burgundy'
              }`}
              aria-controls={listId}
            >
              <span>{countLabel}</span>
              <Chevron className="text-gold" />
            </summary>
            <ul id={listId} className="mt-2 flex flex-col gap-2">
              {comments.map((row) => (
                <li
                  key={row.id}
                  className={
                    meeting
                      ? 'rounded-xl border border-gold/25 bg-burgundy/35 px-3.5 py-2.5'
                      : 'rounded-xl border border-rule/50 bg-cream/90 px-3.5 py-2.5'
                  }
                >
                  <p
                    className={
                      meeting
                        ? 'text-xs font-semibold text-gold'
                        : 'text-xs font-semibold text-ink/60'
                    }
                  >
                    {row.name}
                  </p>
                  <p
                    className={
                      meeting
                        ? 'mt-1 whitespace-pre-wrap text-sm leading-snug text-cream'
                        : 'mt-0.5 whitespace-pre-wrap text-sm'
                    }
                  >
                    {row.text}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <TextArea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          if (status === 'saved') setStatus('idle')
        }}
        placeholder="Add your comment here..."
        aria-label={ariaLabel}
        className={
          meeting
            ? 'border-gold/35 bg-burgundy/40 text-cream placeholder:text-cream/40 hover:border-gold/60 focus:bg-burgundy/55 focus:ring-gold'
            : undefined
        }
      />
      <div className="flex flex-wrap items-center justify-end gap-3">
        {status !== 'idle' ? (
          <p
            role="status"
            aria-live="polite"
            className={`mr-auto text-xs ${meeting ? 'text-gold' : 'text-ink/60'}`}
          >
            {status === 'saving' ? 'Saving…' : 'Saved.'}
          </p>
        ) : (
          <span className="mr-auto" />
        )}
        {actions}
        <Button
          type="button"
          size="sm"
          variant={meeting ? 'ghost' : 'primary'}
          disabled={!canSubmit}
          className={
            meeting ? 'border-gold/60 text-gold hover:bg-gold hover:text-ink' : undefined
          }
          onClick={() => void handleSave()}
        >
          Add comment
        </Button>
      </div>
    </div>
  )
}

function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 shrink-0 transition-transform duration-150 group-open:rotate-180 ${className}`}
    >
      <path
        d="M5 8l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
