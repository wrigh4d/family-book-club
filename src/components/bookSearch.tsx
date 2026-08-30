import type {FormEvent, ReactNode} from 'react'
import {formatBookFacts} from '../lib/bookMeta'
import type {BookSearchHit} from '../lib/openLibrary'
import {Button, Cover, TextInput} from './ui'

export function BookSearchForm({
    query,
    onQueryChange,
    searching,
    onSearch,
    submitLabel = 'Search Open Library',
}: {
    query: string
    onQueryChange: (value: string) => void
    searching: boolean
    onSearch: (event: FormEvent) => void
    submitLabel?: string
}) {
    return (
        <form className="flex flex-col gap-2" onSubmit={onSearch}>
            <TextInput
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search title or author"
                aria-label="Search title or author"
            />
            <Button type="submit" variant="ghost" disabled={searching}>
                {searching ? 'Searching…' : submitLabel}
            </Button>
        </form>
    )
}

export function BookHitRow({
    hit,
    action,
}: {
    hit: BookSearchHit
    action?: ReactNode
}) {
    const facts = formatBookFacts(hit)
    return (
        <li className="flex items-center gap-3 rounded-xl bg-cream p-2">
            <Cover src={hit.coverUrl} title={hit.title} className="h-16 w-11"/>
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{hit.title}</p>
                <p className="truncate text-sm text-ink/70">{hit.author}</p>
                {facts ? <p className="truncate text-xs text-ink/60">{facts}</p> : null}
            </div>
            {action}
        </li>
    )
}

export function BookPickList({
    books,
    onPick,
    statusFor,
}: {
    books: BookSearchHit[]
    onPick: (hit: BookSearchHit) => void
    statusFor?: (hit: BookSearchHit) => string | null
}) {
    return (
        <ul className="flex flex-col gap-2">
            {books.map((hit) => {
                const facts = formatBookFacts(hit)
                const blocked = statusFor?.(hit) ?? null
                return (
                    <li key={hit.olid}>
                        <button
                            type="button"
                            disabled={Boolean(blocked)}
                            className="flex w-full items-center gap-3 rounded-xl bg-cream p-2 text-left transition hover:bg-burgundy/10 disabled:pointer-events-none disabled:opacity-60"
                            onClick={() => onPick(hit)}
                        >
                            <Cover src={hit.coverUrl} title={hit.title} className="h-16 w-11"/>
                            <span className="min-w-0">
                                <span className="block font-semibold">{hit.title}</span>
                                <span className="block text-sm text-ink/70">{hit.author}</span>
                                {facts ? <span className="block text-xs text-ink/60">{facts}</span> : null}
                                {blocked ? <span className="block text-xs text-ink/50">{blocked}</span> : null}
                            </span>
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}
