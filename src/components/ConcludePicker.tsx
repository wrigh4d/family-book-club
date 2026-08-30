import {type AppRecommendation, type ClubState, type CurrentBook} from '../types'
import {useBookSearch} from '../lib/useBookSearch'
import {BookHitRow, BookSearchForm} from './bookSearch'
import {Button, Cover, ErrorBanner} from './ui'

export function ConcludePicker({
    shortlist,
    recs,
    onAddRec,
    onPick,
}: {
    shortlist: ClubState['nominations']
    recs: {genre: AppRecommendation | null; ratings: AppRecommendation | null}
    onAddRec: (rec: AppRecommendation) => void
    onPick: (book: CurrentBook) => void
}) {
    return (
        <div className="flex flex-col gap-4">
            {recs.genre ? (
                <ConcludeRec
                    label="Most popular in this round’s genre"
                    rec={recs.genre}
                    onShortlist={shortlist.some((book) => book.olid === recs.genre?.olid)}
                    onAdd={() => onAddRec(recs.genre!)}
                />
            ) : null}
            {recs.ratings ? (
                <ConcludeRec
                    label="From past club ratings"
                    rec={recs.ratings}
                    onShortlist={shortlist.some((book) => book.olid === recs.ratings?.olid)}
                    onAdd={() => onAddRec(recs.ratings!)}
                />
            ) : null}
            <p className="font-semibold">Pick the next book from the shortlist</p>
            {shortlist.length === 0 ? (
                <p className="text-sm text-ink/70">
                    Shortlist is empty. Add a rec, search below, or go back and nominate.
                </p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {shortlist.map((book) => (
                        <li key={book.id}>
                            <button
                                type="button"
                                className="flex w-full items-center gap-3 rounded-xl bg-cream p-2 text-left transition hover:bg-burgundy/10"
                                onClick={() => onPick(book)}
                            >
                                <Cover src={book.coverUrl} title={book.title} className="h-16 w-11"/>
                                <span>
                                    <span className="block font-semibold">{book.title}</span>
                                    <span className="text-sm text-ink/70">{book.author}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <ConcludeSearch onPick={onPick}/>
        </div>
    )
}

function ConcludeSearch({onPick}: {onPick: (book: CurrentBook) => void}) {
    const {query, setQuery, hits, searching, searchError, runSearch} = useBookSearch()

    return (
        <div className="flex flex-col gap-3">
            <p className="font-semibold">Or search Open Library</p>
            <BookSearchForm
                query={query}
                onQueryChange={setQuery}
                searching={searching}
                onSearch={runSearch}
                submitLabel="Search"
            />
            <ErrorBanner message={searchError}/>
            <ul className="flex flex-col gap-2">
                {hits.map((hit) => (
                    <BookHitRow
                        key={hit.olid}
                        hit={hit}
                        action={
                            <Button type="button" onClick={() => onPick(hit)}>
                                Choose
                            </Button>
                        }
                    />
                ))}
            </ul>
        </div>
    )
}

function ConcludeRec({
    label,
    rec,
    onShortlist,
    onAdd,
}: {
    label: string
    rec: AppRecommendation
    onShortlist: boolean
    onAdd: () => void
}) {
    return (
        <div className="rounded-xl border border-gold/40 bg-cream p-3">
            <p className="text-xs uppercase tracking-wide text-gold">{label}</p>
            <div className="mt-2 flex gap-3">
                <Cover src={rec.coverUrl} title={rec.title} className="h-20 w-14"/>
                <div className="min-w-0 flex-1">
                    <p className="font-display text-xl">{rec.title}</p>
                    <p className="text-sm text-ink/70">{rec.author}</p>
                    <p className="mt-1 text-sm text-ink/70">{rec.why}</p>
                    <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 py-2"
                        disabled={onShortlist}
                        onClick={onAdd}
                    >
                        {onShortlist ? 'On the shortlist' : 'Add to shortlist'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
