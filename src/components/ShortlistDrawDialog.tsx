import { useEffect, useId, useRef } from 'react'
import { Button, Cover, TextButton } from './ui'

export function ShortlistDrawDialog({
  title,
  author,
  coverUrl,
  onChoose,
  onSkip,
}: {
  title: string
  author: string
  coverUrl: string | null
  onChoose: () => void
  onSkip: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const onSkipRef = useRef(onSkip)

  useEffect(() => {
    onSkipRef.current = onSkip
  }, [onSkip])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onSkipRef.current()
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
      onClick={onSkip}
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
            aria-label="Close"
            className="text-2xl leading-none text-ink/50"
            onClick={onSkip}
          >
            ×
          </button>
        </div>
        <p className="text-center text-xs font-semibold tracking-wide text-gold uppercase">Shortlist</p>
        <Cover
          src={coverUrl}
          title={title}
          loading="eager"
          className="mx-auto mt-3 h-56 w-36 shadow-md ring-1 ring-gold/40"
        />
        <h2 id={titleId} className="mt-4 text-center font-display text-3xl leading-tight">
          {title}
        </h2>
        <p className="mt-1 text-center text-sm text-ink/70">{author}</p>
        <div className="mt-5 flex flex-col items-center gap-3">
          <Button type="button" onClick={onChoose}>
            Choose
          </Button>
          <TextButton onClick={onSkip}>Skip</TextButton>
        </div>
      </div>
    </div>
  )
}
