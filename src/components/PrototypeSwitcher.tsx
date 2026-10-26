import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export type PrototypeVariant = {
  id: string
  name: string
}

// PROTOTYPE switcher. Hidden in production builds.
export function PrototypeSwitcher({ variants }: { variants: PrototypeVariant[] }) {
  const [params, setParams] = useSearchParams()
  const currentId = params.get('variant') ?? variants[0]?.id ?? 'A'
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.id === currentId),
  )
  const shown = variants[index] ?? variants[0]

  function go(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length]
    if (!next) return
    const nextParams = new URLSearchParams(params)
    nextParams.set('variant', next.id)
    setParams(nextParams, { replace: true })
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select'))
      ) {
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        go(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        go(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!import.meta.env.DEV || !shown) return null

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1 rounded-full bg-ink px-1.5 py-1.5 text-cream shadow-[var(--shadow-lift)]">
      <button
        type="button"
        aria-label="Previous variant"
        className="grid h-11 w-11 place-items-center rounded-full text-lg hover:bg-cream/15"
        onClick={() => go(-1)}
      >
        ←
      </button>
      <p className="min-w-44 px-2 text-center text-sm font-semibold">
        {shown.id} · {shown.name}
      </p>
      <button
        type="button"
        aria-label="Next variant"
        className="grid h-11 w-11 place-items-center rounded-full text-lg hover:bg-cream/15"
        onClick={() => go(1)}
      >
        →
      </button>
    </div>
  )
}
