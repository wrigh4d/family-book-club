import {useEffect, useState} from 'react'
import {friendlyFirebaseError} from '../lib/errors'
import {type BookSearchHit, popularBooksOverall} from '../lib/openLibrary'
import {useBookSearch} from '../lib/useBookSearch'
import type {CurrentBook} from '../types'
import {BookPickList, BookSearchForm} from './bookSearch'
import {Card, ErrorBanner} from './ui'

export function FirstBookSetup({onPick}: {onPick: (book: CurrentBook) => void}) {
    const {query, setQuery, hits, searching, searchError, runSearch} = useBookSearch()
    const [popular, setPopular] = useState<BookSearchHit[]>([])
    const [popularError, setPopularError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        popularBooksOverall()
            .then((books) => {
                if (!cancelled) setPopular(books)
            })
            .catch((err) => {
                if (!cancelled) setPopularError(friendlyFirebaseError(err))
            })
        return () => {
            cancelled = true
        }
    }, [])

    function asCurrent(hit: BookSearchHit): CurrentBook {
        return {
            olid: hit.olid,
            title: hit.title,
            author: hit.author,
            coverUrl: hit.coverUrl,
            genre: hit.genre,
        }
    }

    return (
        <Card className="flex flex-col gap-5">
            <div>
                <p className="text-xs uppercase tracking-wide text-gold">First book</p>
                <h2 className="font-display text-2xl">Choose the starting book</h2>
                <p className="mt-1 text-sm text-ink/70">
                    The club page opens after you pick this. Recs below are popular overall, not based on this club.
                </p>
            </div>
            <BookSearchForm
                query={query}
                onQueryChange={setQuery}
                searching={searching}
                onSearch={runSearch}
            />
            <ErrorBanner message={searchError ?? popularError}/>
            {hits.length > 0 ? (
                <BookPickList books={hits} onPick={(hit) => onPick(asCurrent(hit))}/>
            ) : null}
            <div>
                <p className="mb-2 font-semibold">Popular right now</p>
                {popular.length === 0 && !popularError ? (
                    <p className="text-sm text-ink/60">Loading popular titles…</p>
                ) : (
                    <BookPickList books={popular} onPick={(hit) => onPick(asCurrent(hit))}/>
                )}
            </div>
        </Card>
    )
}
