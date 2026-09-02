import { useState } from 'react'
import { availableShortlist, clubBookStatus, clubBookStatusLabel } from '../lib/bookStatus'
import {
  changeCurrentBook,
  currentHistoryBook,
  rateCurrentBook,
  resolveCurrentBook,
  savePersonalNote,
} from '../lib/store'
import { useBookFacts } from '../lib/useBookFacts'
import { useBookSearch } from '../lib/useBookSearch'
import type { ClubState, CurrentBook } from '../types'
import { BookPickList, BookSearchForm } from './bookSearch'
import { Button, Card, CardTitle, Cover, ErrorBanner, Subhead, TextArea, TextButton } from './ui'

export function CurrentBookCard({
  code,
  uid,
  state,
  owner,
  onError,
}: {
  code: string
  uid: string
  state: ClubState
  owner?: boolean
  onError: (err: unknown) => void
}) {
  const current = resolveCurrentBook(state)
  const history = currentHistoryBook(state)
  const myRating = history?.ratings[uid]
  const remoteNote = history?.notes?.[uid] ?? ''
  const currentId = current?.olid ?? ''
  const [draft, setDraft] = useState<{ bookId: string; text: string | null }>({
    bookId: currentId,
    text: null,
  })
  const [changeForId, setChangeForId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const note = (draft.bookId === currentId ? draft.text : null) ?? remoteNote
  const changing = Boolean(current && changeForId === current.olid)
  const facts = useBookFacts(current)

  if (!current) {
    return (
      <Card className="flex flex-col gap-4">
        <CardTitle>Current book</CardTitle>
        <p className="text-sm text-ink/70">None yet. The owner will pick one after presenting.</p>
      </Card>
    )
  }

  async function replaceWith(book: CurrentBook) {
    setBusy(true)
    try {
      await changeCurrentBook(code, state, uid, book)
      setChangeForId(null)
    } catch (err) {
      onError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>Current book</CardTitle>
      <div className="flex gap-3">
        <Cover
          src={current.coverUrl}
          title={current.title}
          loading="eager"
          className="h-36 w-24 ring-1 ring-gold/40"
        />
        <div>
          <p className="font-display text-xl">{current.title}</p>
          <p className="text-sm text-ink/70">{current.author}</p>
          {facts ? <p className="mt-1 text-sm text-ink/60">{facts}</p> : null}
        </div>
      </div>
      {changing ? (
        <ChangeCurrentPicker
          state={state}
          busy={busy}
          onPick={(book) => void replaceWith(book)}
          onCancel={() => setChangeForId(null)}
        />
      ) : (
        <>
          <div>
            <Subhead>Your rating</Subhead>
            <div className="flex gap-2" role="group" aria-label="Rate the current book">
              {[1, 2, 3, 4, 5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  aria-label={`Rate ${stars} out of 5`}
                  aria-pressed={myRating === stars}
                  className={`h-11 w-11 rounded-full border transition duration-150 ${
                    myRating === stars
                      ? 'border-burgundy bg-burgundy text-cream hover:bg-burgundy-dark'
                      : 'border-rule bg-cream hover:border-burgundy hover:bg-burgundy/10'
                  }`}
                  onClick={() => rateCurrentBook(code, state, uid, stars).catch(onError)}
                >
                  {stars}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Subhead>Your note</Subhead>
            <TextArea
              value={note}
              onChange={(event) => setDraft({ bookId: currentId, text: event.target.value })}
              placeholder="A thought for the meeting — optional"
              aria-label="Your note on the current book"
            />
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              {owner ? (
                <Button type="button" variant="ghost" onClick={() => setChangeForId(current.olid)}>
                  Change current book
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                onClick={() => savePersonalNote(code, state, uid, note).catch(onError)}
              >
                Save note
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

function ChangeCurrentPicker({
  state,
  busy,
  onPick,
  onCancel,
}: {
  state: ClubState
  busy: boolean
  onPick: (book: CurrentBook) => void
  onCancel: () => void
}) {
  const { query, setQuery, hits, searching, searchError, runSearch } = useBookSearch()
  const shortlist = availableShortlist(state)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink/70">
        This book was never finished. Replacing it deletes ratings, notes, and every other record of
        it.
      </p>
      {shortlist.length > 0 ? (
        <div>
          <Subhead>From the shortlist</Subhead>
          <ul className="flex flex-col gap-2">
            {shortlist.map((book) => (
              <li key={book.id} className="flex items-center gap-2 rounded-xl bg-cream p-2">
                <Cover src={book.coverUrl} title={book.title} className="h-16 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{book.title}</p>
                  <p className="text-sm text-ink/70">{book.author}</p>
                </div>
                <Button type="button" className="py-2" disabled={busy} onClick={() => onPick(book)}>
                  Choose
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        <Subhead>Search Open Library</Subhead>
        <BookSearchForm
          query={query}
          onQueryChange={setQuery}
          searching={searching || busy}
          onSearch={runSearch}
          submitLabel="Search"
        />
        <ErrorBanner message={searchError} />
        {hits.length > 0 ? (
          <BookPickList
            books={hits}
            statusFor={(hit) =>
              busy ? 'Saving…' : clubBookStatusLabel(clubBookStatus(state, hit))
            }
            onPick={onPick}
          />
        ) : null}
      </div>
      <TextButton onClick={onCancel} disabled={busy}>
        Keep this book
      </TextButton>
    </div>
  )
}
