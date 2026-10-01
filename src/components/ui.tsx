import type {
  ButtonHTMLAttributes,
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'
import { Link } from 'react-router-dom'

export function Page({
  children,
  width = 'narrow',
}: {
  children: ReactNode
  width?: 'narrow' | 'wide'
}) {
  const max = width === 'wide' ? 'max-w-5xl' : 'max-w-xl'
  return (
    <div className="min-h-dvh bg-transparent text-ink pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div
        id="main"
        tabIndex={-1}
        className={`mx-auto flex w-full ${max} flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-none sm:px-6 sm:pt-[max(2.5rem,env(safe-area-inset-top))] sm:pb-[max(2.5rem,env(safe-area-inset-bottom))]`}
      >
        {children}
      </div>
    </div>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-3 text-sm text-ink/65">
      <span className="loading-pulse" aria-hidden="true" />
      {label}
    </p>
  )
}

export function Brand() {
  return (
    <p className="font-display text-sm tracking-[0.14em] text-burgundy uppercase">Book Club</p>
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`text-[11px] font-semibold tracking-[0.18em] text-gold uppercase ${className}`}
    >
      {children}
    </p>
  )
}

export function ClubHeader({ name, action }: { name: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl leading-[1.1] tracking-tight md:text-4xl">
            {name}
          </h1>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      <AccentRule />
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-rule/90 bg-paper p-5 shadow-[var(--shadow-card)] ${className}`}
    >
      {children}
    </section>
  )
}

export function AccentRule({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block h-0.5 w-full rounded-full bg-gradient-to-r from-gold via-gold/65 to-transparent ${className}`}
    />
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-xl leading-tight tracking-tight">{children}</h2>
}

export function Subhead({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink/85">
      <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-gold" />
      {children}
    </p>
  )
}

export function Accordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <details className="group">
        <summary className="flex list-none items-center justify-between gap-3 font-display text-xl outline-none select-none marker:content-none focus-visible:ring-2 focus-visible:ring-burgundy [&::-webkit-details-marker]:hidden">
          {title}
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="h-5 w-5 shrink-0 text-gold transition-transform duration-150 group-open:rotate-180"
          >
            <path
              d="M5 8l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div className="mt-4 flex flex-col gap-5">{children}</div>
      </details>
    </Card>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink/80">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 min-w-0 w-full rounded-xl border border-rule bg-cream/80 px-3.5 py-3 text-base outline-none ring-burgundy transition placeholder:text-ink/35 hover:border-burgundy/50 focus:bg-paper focus:ring-2 focus-visible:ring-2 ${props.className ?? ''}`}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-28 w-full rounded-xl border border-rule bg-cream/80 px-3.5 py-3 text-base outline-none ring-burgundy transition placeholder:text-ink/35 hover:border-burgundy/50 focus:bg-paper focus:ring-2 ${props.className ?? ''}`}
    />
  )
}

export function buttonClass(
  variant: 'primary' | 'secondary' | 'ghost' = 'primary',
  size: 'md' | 'sm' = 'md',
): string {
  const sizes = {
    md: 'rounded-xl px-4 py-3',
    sm: 'rounded-lg px-3 py-2 text-sm',
  }[size]
  const styles = {
    primary:
      'bg-burgundy text-cream shadow-sm hover:bg-burgundy-dark hover:shadow-[var(--shadow-lift)] motion-safe:hover:-translate-y-px',
    secondary:
      'bg-ink text-cream shadow-sm hover:bg-burgundy hover:shadow-[var(--shadow-lift)] motion-safe:hover:-translate-y-px',
    ghost:
      'border border-burgundy/80 bg-transparent text-burgundy hover:bg-burgundy hover:text-cream hover:shadow-md',
  }[variant]
  return `inline-flex min-h-11 items-center justify-center text-center font-semibold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${sizes} ${styles}`
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'sm'
}) {
  return (
    <button {...props} className={`${buttonClass(variant, size)} ${props.className ?? ''}`}>
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
      aria-pressed={Boolean(selected)}
      className={`min-h-9 rounded-full border px-3.5 py-1.5 text-sm transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 focus-visible:ring-offset-cream motion-safe:active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${
        selected
          ? 'border-burgundy bg-burgundy text-cream shadow-sm hover:bg-burgundy-dark'
          : 'border-rule bg-cream/90 text-ink hover:border-burgundy/60 hover:bg-burgundy/8 hover:text-burgundy'
      } ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

const textLinkClass =
  'text-sm font-semibold text-burgundy underline decoration-burgundy/35 underline-offset-2 transition hover:text-burgundy-dark hover:decoration-burgundy'

export function TextButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...props} className={`${textLinkClass} ${className}`}>
      {children}
    </button>
  )
}

export function TextLink({
  to,
  children,
  className = '',
}: {
  to: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link to={to} className={`${textLinkClass} ${className}`}>
      {children}
    </Link>
  )
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-xl border border-burgundy/25 bg-burgundy/8 px-3.5 py-2.5 text-sm text-burgundy"
    >
      {message}
    </p>
  )
}

export function NameForm({
  onSave,
  busyLabel = 'Continue',
  defaultName = '',
}: {
  onSave: (name: string) => Promise<void>
  busyLabel?: string
  defaultName?: string
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
        <TextInput
          name="name"
          autoComplete="name"
          placeholder="Nick"
          defaultValue={defaultName}
          required
          maxLength={80}
        />
      </Field>
      <Button type="submit">{busyLabel}</Button>
    </form>
  )
}

export function GoogleSignInCard({
  onSignIn,
  busy = false,
  title = 'Sign in',
  body = 'Use the same Google account on phone and computer.',
}: {
  onSignIn: () => void
  busy?: boolean
  title?: string
  body?: string
}) {
  return (
    <Card>
      <h2 className="mb-2 font-display text-2xl tracking-tight">{title}</h2>
      <p className="mb-4 text-sm text-ink/65">{body}</p>
      <Button type="button" onClick={onSignIn} disabled={busy}>
        Continue with Google
      </Button>
    </Card>
  )
}

export function Cover({
  src,
  title,
  className = 'h-36 w-24',
  loading = 'lazy',
}: {
  src: string | null
  title: string
  className?: string
  loading?: 'lazy' | 'eager'
}) {
  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-burgundy text-center font-display text-xs text-cream shadow-sm ${className}`}
      >
        {title.slice(0, 18)}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={title}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      className={`shrink-0 rounded-lg object-cover shadow-sm ${className}`}
    />
  )
}
