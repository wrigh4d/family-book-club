import {type BookSearchHit} from '../lib/openLibrary'
import {useBookSearch} from '../lib/useBookSearch'
import type {Nomination} from '../types'
import {BookHitRow, BookSearchForm} from './bookSearch'
import {Button, Cover, ErrorBanner, TextButton} from './ui'

export function Nominate({
    existingOlids,
    onAdd,
}: {
    existingOlids: string[]
    onAdd: (hit: BookSearchHit) => Promise<void>
}) {
    const {query, setQuery, hits, searching, searchError, runSearch} = useBookSearch()

    return (
        <div className="flex flex-col gap-3">
            <p className="font-semibold">Add a book</p>
            <BookSearchForm
                query={query}
                onQueryChange={setQuery}
                searching={searching}
                onSearch={runSearch}
            />
            <ErrorBanner message={searchError}/>
            <ul className="flex flex-col gap-2">
                {hits.map((hit) => {
                    const added = existingOlids.includes(hit.olid)
                    return (
                        <BookHitRow
                            key={hit.olid}
                            hit={hit}
                            action={
                                <Button type="button" disabled={added} onClick={() => onAdd(hit)}>
                                    {added ? 'Added' : 'Add'}
                                </Button>
                            }
                        />
                    )
                })}
            </ul>
        </div>
    )
}

export function Shortlist({
    books,
    uid,
    onFlag,
}: {
    books: Nomination[]
    uid: string
    onFlag: (id: string, already: boolean) => Promise<void>
}) {
    if (!books.length) {
        return <p className="text-sm text-ink/70">No books yet. Search above to add one.</p>
    }
    return (
        <ul className="flex flex-col gap-3">
            {books.map((book) => {
                const already = book.alreadyReadBy.includes(uid)
                return (
                    <li key={book.id} className="flex gap-3 rounded-xl bg-cream p-2">
                        <Cover src={book.coverUrl} title={book.title} className="h-20 w-14"/>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold">{book.title}</p>
                            <p className="text-sm text-ink/70">{book.author}</p>
                            <p className="text-xs text-ink/60">
                                {book.genre} · nominated by {book.nominatedByName}
                                {book.alreadyReadBy.length ? ` · ${book.alreadyReadBy.length} already read` : ''}
                            </p>
                            <TextButton className="mt-1" onClick={() => onFlag(book.id, already)}>
                                {already ? 'I haven’t read this' : 'I’ve already read this'}
                            </TextButton>
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
