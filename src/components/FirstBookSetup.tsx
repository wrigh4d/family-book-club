import { useEffect, useState } from 'react'
import { friendlyFirebaseError } from '../lib/errors'
import { type BookSearchHit, popularBooksOverall } from '../lib/openLibrary'
import { useBookSearch } from '../lib/useBookSearch'
import type { CurrentBook } from '../types'
import { BookPickList, BookSearchForm } from './bookSearch'
import { Card, CardTitle, ErrorBanner, Subhead } from './ui'

export function FirstBookSetup({
  onPick,
  statusFor,
}: {
  onPick: (book: CurrentBook) => void
  statusFor?: (book: { olid: string; title: string }) => string | null
}) {
  const { query, setQuery, hits, searching, searchError, runSearch } = useBookSearch()
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
      firstPublishYear: hit.firstPublishYear,
      pageCount: hit.pageCount,
    }
  }

  return (
    <Card className="flex flex-col gap-5">
      <CardTitle>Choose the starting book</CardTitle>
      <BookSearchForm
        query={query}
        onQueryChange={setQuery}
        searching={searching}
        onSearch={runSearch}
      />
      <ErrorBanner message={searchError ?? popularError} />
      {hits.length > 0 ? (
        <BookPickList books={hits} statusFor={statusFor} onPick={(hit) => onPick(asCurrent(hit))} />
      ) : null}
      <div>
        <Subhead>Popular right now</Subhead>
        {popular.length === 0 && !popularError ? (
          <p className="text-sm text-ink/60">Loading popular titles…</p>
        ) : (
          <BookPickList
            books={popular}
            statusFor={statusFor}
            onPick={(hit) => onPick(asCurrent(hit))}
          />
        )}
      </div>
    </Card>
  )
}
