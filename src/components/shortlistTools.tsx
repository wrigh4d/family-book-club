import { useState, type FormEvent } from 'react'
import { searchBooks, type BookSearchHit } from '../lib/openLibrary'
import { friendlyFirebaseError } from '../lib/errors'
import type { Nomination } from '../types'
import { Button, Cover, ErrorBanner, TextButton, TextInput } from './ui'

export function Nominate({
  existingOlids,
  onAdd,
}: {
  existingOlids: string[]
  onAdd: (hit: BookSearchHit) => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<BookSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  async function runSearch(event: FormEvent) {
    event.preventDefault()
    setSearching(true)
    setSearchError(null)
    try {
      setHits(await searchBooks(query))
    } catch (err) {
      setSearchError(friendlyFirebaseError(err))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold">Add a book</p>
      <form className="flex flex-col gap-2" onSubmit={runSearch}>
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or author"
        />
        <Button type="submit" variant="ghost" disabled={searching}>
          {searching ? 'Searching…' : 'Search Open Library'}
        </Button>
      </form>
      <ErrorBanner message={searchError} />
      <ul className="flex flex-col gap-2">
        {hits.map((hit) => (
          <li key={hit.olid} className="flex items-center gap-3 rounded-xl bg-cream p-2">
            <Cover src={hit.coverUrl} title={hit.title} className="h-16 w-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{hit.title}</p>
              <p className="truncate text-sm text-ink/70">{hit.author}</p>
            </div>
            <Button
              type="button"
              disabled={existingOlids.includes(hit.olid)}
              onClick={() => onAdd(hit)}
            >
              {existingOlids.includes(hit.olid) ? 'Added' : 'Add'}
            </Button>
          </li>
        ))}
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
            <Cover src={book.coverUrl} title={book.title} className="h-20 w-14" />
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
