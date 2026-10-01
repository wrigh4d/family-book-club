import { availableShortlist, clubBookStatus, clubBookStatusLabel } from '../lib/bookStatus'
import { useBookSearch } from '../lib/useBookSearch'
import {
  type AppRecommendation,
  type ClubState,
  type CurrentBook,
  recToCurrentBook,
} from '../types'
import { BookHitRow, BookRow, BookSearchForm } from './bookSearch'
import { Button, Cover, ErrorBanner, TextButton } from './ui'

export function ConcludePicker({
  state,
  recs,
  onAddRec,
  onPick,
  onRemove,
}: {
  state: ClubState
  recs: { genre: AppRecommendation | null; ratings: AppRecommendation | null }
  onAddRec: (rec: AppRecommendation) => void
  onPick: (book: CurrentBook) => void
  onRemove: (id: string) => void
}) {
  const shortlist = availableShortlist(state)
  return (
    <div className="flex flex-col gap-4">
      {recs.genre ? (
        <ConcludeRec
          label="Most popular in this round’s genre"
          rec={recs.genre}
          blocked={clubBookStatusLabel(clubBookStatus(state, recs.genre))}
          listedId={shortlist.find((book) => book.olid === recs.genre?.olid)?.id}
          onAdd={() => onAddRec(recs.genre!)}
          onChoose={() => onPick(recToCurrentBook(recs.genre!))}
          onRemove={onRemove}
        />
      ) : null}
      {recs.ratings ? (
        <ConcludeRec
          label="From past club ratings"
          rec={recs.ratings}
          blocked={clubBookStatusLabel(clubBookStatus(state, recs.ratings))}
          listedId={shortlist.find((book) => book.olid === recs.ratings?.olid)?.id}
          onAdd={() => onAddRec(recs.ratings!)}
          onChoose={() => onPick(recToCurrentBook(recs.ratings!))}
          onRemove={onRemove}
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
            <BookRow
              key={book.id}
              coverUrl={book.coverUrl}
              title={book.title}
              author={book.author}
              action={
                <div className="flex items-center justify-end gap-3">
                  <TextButton onClick={() => onRemove(book.id)}>Remove</TextButton>
                  <Button type="button" size="sm" onClick={() => onPick(book)}>
                    Choose
                  </Button>
                </div>
              }
            />
          ))}
        </ul>
      )}
      <ConcludeSearch state={state} onPick={onPick} />
    </div>
  )
}

function ConcludeSearch({
  state,
  onPick,
}: {
  state: ClubState
  onPick: (book: CurrentBook) => void
}) {
  const { query, setQuery, hits, searching, searchError, runSearch } = useBookSearch()

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
      <ErrorBanner message={searchError} />
      <ul className="flex flex-col gap-2">
        {hits.map((hit) => {
          const blocked = clubBookStatusLabel(clubBookStatus(state, hit))
          return (
            <BookHitRow
              key={hit.olid}
              hit={hit}
              action={
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={Boolean(blocked)}
                  onClick={() => onPick(hit)}
                >
                  {blocked ?? 'Choose'}
                </Button>
              }
            />
          )
        })}
      </ul>
    </div>
  )
}

function ConcludeRec({
  label,
  rec,
  blocked,
  listedId,
  onAdd,
  onChoose,
  onRemove,
}: {
  label: string
  rec: AppRecommendation
  blocked: string | null
  listedId?: string
  onAdd: () => void
  onChoose: () => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="rounded-xl border border-gold/40 bg-cream p-3">
      <p className="text-xs uppercase tracking-wide text-gold">{label}</p>
      <div className="mt-2 flex gap-3">
        <Cover src={rec.coverUrl} title={rec.title} className="h-20 w-14" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl break-words">{rec.title}</p>
          <p className="text-sm text-ink/70">{rec.author}</p>
          <p className="mt-1 text-sm text-ink/70">{rec.why}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={Boolean(blocked)} onClick={onChoose}>
              {blocked ?? 'Choose'}
            </Button>
            {blocked ? null : listedId ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(listedId)}>
                Remove from shortlist
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
                Add to shortlist
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
