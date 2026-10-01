import { useState } from 'react'
import { availableShortlist, clubBookStatus, clubBookStatusLabel } from '../lib/bookStatus'
import {
  changeCurrentBook,
  clubBookComments,
  currentHistoryBook,
  rateCurrentBook,
  resolveCurrentBook,
  savePersonalNote,
} from '../lib/store'
import { useBookFacts } from '../lib/useBookFacts'
import { useBookSearch } from '../lib/useBookSearch'
import type { ClubState, CurrentBook } from '../types'
import { BookPickList, BookRow, BookSearchForm } from './bookSearch'
import { CommentSection } from './CommentSection'
import { Button, Card, CardTitle, Cover, ErrorBanner, Subhead, TextButton } from './ui'

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
  const [changeForId, setChangeForId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const changing = Boolean(current && changeForId === current.olid)
  const facts = useBookFacts(current)
  const comments = clubBookComments(state).map((row) => ({
    id: row.id,
    name: row.name,
    text: row.text,
    at: row.at,
  }))

  if (!current) {
    return (
      <Card className="flex flex-col gap-4">
        <CardTitle>Current book</CardTitle>
        <p className="text-sm text-ink/65">None yet. The owner will pick one next.</p>
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
      <div className="flex gap-4">
        <Cover
          src={current.coverUrl}
          title={current.title}
          loading="eager"
          className="h-36 w-24 shadow-md ring-1 ring-gold/35 sm:h-48 sm:w-32"
        />
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight break-words">{current.title}</p>
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
            <Subhead>Rating</Subhead>
            <div className="flex gap-1.5" role="group" aria-label="Rate the current book">
              {[1, 2, 3, 4, 5].map((stars) => {
                const filled = myRating != null && stars <= myRating
                return (
                  <button
                    key={stars}
                    type="button"
                    aria-label={`Rate ${stars} out of 5`}
                    aria-pressed={myRating === stars}
                    className={`grid h-11 w-11 place-items-center rounded-full border transition duration-150 ${
                      filled
                        ? 'border-gold/70 bg-gold/15 text-gold'
                        : 'border-rule bg-cream text-ink/30 hover:border-gold hover:text-gold'
                    }`}
                    onClick={() => rateCurrentBook(code, state, uid, stars).catch(onError)}
                  >
                    <StarIcon filled={filled} />
                  </button>
                )
              })}
            </div>
          </div>
          <CommentSection
            comments={comments}
            bookTitle={current.title}
            ariaLabel="Comment on the current book"
            onError={onError}
            onSave={(text) => savePersonalNote(code, state, uid, text)}
            actions={
              owner ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setChangeForId(current.olid)}
                >
                  Change book
                </Button>
              ) : null
            }
          />
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
      <p className="text-sm text-ink/65">
        Replacing this unfinished book clears its ratings and notes.
      </p>
      {shortlist.length > 0 ? (
        <div>
          <Subhead>From the shortlist</Subhead>
          <ul className="flex flex-col gap-2">
            {shortlist.map((book) => (
              <BookRow
                key={book.id}
                coverUrl={book.coverUrl}
                title={book.title}
                author={book.author}
                action={
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={() => onPick(book)}
                  >
                    Choose
                  </Button>
                }
              />
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

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5">
      <path
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.25"
        d="M10 2.4 12.2 7l5 .6-3.7 3.4.9 5L10 13.6 5.6 16l.9-5L2.8 7.6 7.8 7 10 2.4Z"
      />
    </svg>
  )
}
