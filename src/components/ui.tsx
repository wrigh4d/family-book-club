import type {
  ButtonHTMLAttributes,
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 sm:py-10">
        {children}
      </div>
    </div>
  )
}

export function Brand() {
  return (
    <p className="font-display text-sm tracking-wide text-burgundy">Family Book Club</p>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-rule bg-paper p-4 shadow-sm ${className}`}>
      {children}
    </section>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-rule bg-cream px-3 py-3 outline-none ring-burgundy transition hover:border-burgundy focus:ring-2 ${props.className ?? ''}`}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full rounded-xl border border-rule bg-cream px-3 py-3 outline-none ring-burgundy transition hover:border-burgundy focus:ring-2 ${props.className ?? ''}`}
    />
  )
}

export function buttonClass(variant: 'primary' | 'secondary' | 'ghost' = 'primary'): string {
  const styles = {
    primary:
      'bg-burgundy text-cream hover:bg-[#5c211b] hover:shadow-md hover:-translate-y-px',
    secondary:
      'bg-ink text-cream hover:bg-burgundy hover:shadow-md hover:-translate-y-px',
    ghost:
      'border border-burgundy bg-transparent text-burgundy hover:bg-burgundy hover:text-cream hover:shadow-md',
  }[variant]
  return `inline-flex items-center justify-center rounded-xl px-4 py-3 text-center font-semibold transition duration-150 ease-out active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${styles}`
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  return (
    <button {...props} className={`${buttonClass(variant)} ${props.className ?? ''}`}>
      {children}
    </button>
  )
}

export function Chip({
  selected,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-full border px-3 py-1.5 text-sm transition duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${
        selected
          ? 'border-burgundy bg-burgundy text-cream hover:bg-[#5c211b] hover:shadow-sm'
          : 'border-rule bg-cream text-ink hover:border-burgundy hover:bg-burgundy/10 hover:text-burgundy'
      } ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function ThumbButton({
  direction,
  selected,
  count = 0,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  direction: 'up' | 'down'
  selected?: boolean
  count?: number
}) {
  const on = Boolean(selected)
  const up = direction === 'up'
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={up ? `Like, ${count}` : `Dislike, ${count}`}
      {...props}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition duration-150 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 ${
        on
          ? up
            ? 'border-moss bg-moss text-cream hover:bg-[#3d4a36]'
            : 'border-burgundy bg-burgundy text-cream hover:bg-[#5c211b]'
          : 'border-rule bg-paper text-ink hover:border-burgundy hover:bg-burgundy/10'
      } ${props.className ?? ''}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        {up ? (
          <path d="M2 21h4V9H2v12Zm20-11c0-1.1-.9-2-2-2h-6.3l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1Z" />
        ) : (
          <path d="M22 3h-4v12h4V3ZM2 14c0 1.1.9 2 2 2h6.3l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2H7c-.83 0-1.54.5-1.84 1.22L2.14 11.27c-.09.23-.14.47-.14.73v2Z" />
        )}
      </svg>
      <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-ink px-1 text-center text-[11px] font-semibold leading-5 text-cream">
        {count}
      </span>
    </button>
  )
}

export function TextButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`text-sm font-semibold text-burgundy underline decoration-burgundy/40 underline-offset-2 transition hover:text-[#5c211b] hover:decoration-burgundy ${className}`}
    >
      {children}
    </button>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="rounded-xl border border-burgundy/30 bg-burgundy/10 px-3 py-2 text-sm text-burgundy">
      {message}
    </p>
  )
}

export function NameForm({
  onSave,
  busyLabel = 'Continue',
}: {
  onSave: (name: string) => Promise<void>
  busyLabel?: string
}) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '')
    await onSave(name)
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Field label="Your name">
        <TextInput name="name" autoComplete="name" placeholder="Nick" required />
      </Field>
      <Button type="submit">{busyLabel}</Button>
    </form>
  )
}

export function Cover({
  src,
  title,
  className = 'h-36 w-24',
}: {
  src: string | null
  title: string
  className?: string
}) {
  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-burgundy text-center font-display text-xs text-cream ${className}`}
      >
        {title.slice(0, 18)}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={title}
      className={`shrink-0 rounded-lg object-cover ${className}`}
    />
  )
}
