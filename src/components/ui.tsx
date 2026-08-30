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

export function Card({children, className = ''}: { children: ReactNode; className?: string }) {
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
                <TextInput name="name" autoComplete="name" placeholder="Nick" required maxLength={80}/>
            </Field>
            <Button type="submit">{busyLabel}</Button>
        </form>
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
