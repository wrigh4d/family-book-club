import type {
  ButtonHTMLAttributes,
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
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
      className={`w-full rounded-xl border border-rule bg-cream px-3 py-3 outline-none ring-burgundy focus:ring-2 ${props.className ?? ''}`}
    />
  )
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  const styles = {
    primary: 'bg-burgundy text-cream hover:bg-burgundy-dark',
    secondary: 'bg-ink text-cream hover:bg-black',
    ghost: 'bg-transparent text-burgundy border border-burgundy',
  }[variant]
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-3 font-semibold disabled:opacity-50 ${styles} ${props.className ?? ''}`}
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
