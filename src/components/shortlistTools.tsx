import { clubBookStatus, clubBookStatusLabel } from '../lib/bookStatus'
import { type BookSearchHit } from '../lib/openLibrary'
import { useBookSearch } from '../lib/useBookSearch'
import type { ClubState, Nomination } from '../types'
import { BookHitRow, BookSearchForm } from './bookSearch'
import { Button, Cover, ErrorBanner, TextButton } from './ui'

export function Nominate({
  state,
  onAdd,
  onRemove,
}: {
  state: ClubState
  onAdd: (hit: BookSearchHit) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const { query, setQuery, hits, searching, searchError, runSearch } = useBookSearch()

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold">Add a book</p>
      <BookSearchForm
        query={query}
        onQueryChange={setQuery}
        searching={searching}
        onSearch={runSearch}
      />
      <ErrorBanner message={searchError} />
      <ul className="flex flex-col gap-2">
        {hits.map((hit) => {
          const status = clubBookStatus(state, hit)
          const blocked = clubBookStatusLabel(status)
          const listed = state.nominations.find((book) => book.olid === hit.olid)
          return (
            <BookHitRow
              key={hit.olid}
              hit={hit}
              action={
                blocked ? (
                  <Button type="button" variant="ghost" disabled>
                    {blocked}
                  </Button>
                ) : listed ? (
                  <Button type="button" variant="ghost" onClick={() => onRemove(listed.id)}>
                    Remove
                  </Button>
                ) : (
                  <Button type="button" onClick={() => onAdd(hit)}>
                    Add
                  </Button>
                )
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
  onRemove,
}: {
  books: Nomination[]
  uid: string
  onFlag: (id: string, already: boolean) => Promise<void>
  onRemove: (id: string) => Promise<void>
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
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <TextButton onClick={() => onFlag(book.id, already)}>
                  {already ? 'I haven’t read this' : 'I’ve already read this'}
                </TextButton>
                <TextButton onClick={() => onRemove(book.id)}>Remove</TextButton>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
