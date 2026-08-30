import type {ButtonHTMLAttributes, FormEvent, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes,} from 'react'

export function Page({children}: { children: ReactNode }) {
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

export function ClubHeader({name, action}: {name: string; action?: ReactNode}) {
    return (
        <header className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <Brand/>
                    <h1 className="font-display text-3xl">{name}</h1>
                </div>
                {action ? <div className="flex shrink-0 flex-col items-end gap-2">{action}</div> : null}
            </div>
            <AccentRule/>
        </header>
    )
}

export function Card({children, className = ''}: { children: ReactNode; className?: string }) {
    return (
        <section className={`rounded-2xl border border-rule bg-paper p-4 shadow-sm ${className}`}>
            {children}
        </section>
    )
}

export function AccentRule({className = ''}: {className?: string}) {
    return (
        <span
            aria-hidden="true"
            className={`block h-0.5 w-full rounded-full bg-gradient-to-r from-gold via-gold/70 to-gold/15 ${className}`}
        />
    )
}

export function CardTitle({children}: {children: ReactNode}) {
    return (
        <div>
            <h2 className="font-display text-2xl">{children}</h2>
            <AccentRule className="mt-2"/>
        </div>
    )
}

export function Subhead({children}: {children: ReactNode}) {
    return (
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true" className="h-3.5 w-0.5 rounded-full bg-gold"/>
            {children}
        </p>
    )
}

export function Accordion({
    title,
    children,
}: {
    title: string
    children: ReactNode
}) {
    return (
        <Card>
            <details className="group">
                <summary className="flex list-none flex-col outline-none select-none marker:content-none focus-visible:ring-2 focus-visible:ring-burgundy [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center justify-between gap-3 font-display text-2xl">
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
                    </span>
                    <AccentRule className="mt-2"/>
                </summary>
                <div className="mt-4 flex flex-col gap-5">{children}</div>
            </details>
        </Card>
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
            'bg-burgundy text-cream hover:bg-burgundy-dark hover:shadow-md hover:-translate-y-px',
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
            aria-pressed={Boolean(selected)}
            className={`rounded-full border px-3 py-1.5 text-sm transition duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${
                selected
                    ? 'border-burgundy bg-burgundy text-cream hover:bg-burgundy-dark hover:shadow-sm'
                    : 'border-rule bg-cream text-ink hover:border-burgundy hover:bg-burgundy/10 hover:text-burgundy'
            } ${props.className ?? ''}`}
        >
            {children}
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
            className={`text-sm font-semibold text-burgundy underline decoration-burgundy/40 underline-offset-2 transition hover:text-burgundy-dark hover:decoration-burgundy ${className}`}
        >
            {children}
        </button>
    )
}

export function ErrorBanner({message}: { message: string | null }) {
    if (!message) return null
    return (
        <p role="alert" className="rounded-xl border border-burgundy/30 bg-burgundy/10 px-3 py-2 text-sm text-burgundy">
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
    title = 'Sign in to continue',
    body = 'Use the same Google account on your phone and computer so you only join the club once.',
}: {
    onSignIn: () => void
    busy?: boolean
    title?: string
    body?: string
}) {
    return (
        <Card>
            <h2 className="mb-3 font-display text-2xl">{title}</h2>
            <p className="mb-4 text-sm text-ink/70">{body}</p>
            <Button type="button" onClick={onSignIn} disabled={busy}>
                Continue with Google
            </Button>
        </Card>
    )
}

export function SessionBar({name, onSignOut}: {name: string; onSignOut: () => void}) {
    return (
        <p className="text-sm text-ink/70">
            Signed in as <span className="font-semibold text-ink">{name}</span>
            {' · '}
            <TextButton onClick={onSignOut}>Sign out</TextButton>
        </p>
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
            loading={loading}
            decoding="async"
            referrerPolicy="no-referrer"
            className={`shrink-0 rounded-lg object-cover ${className}`}
        />
    )
}
