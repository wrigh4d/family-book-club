import { CommentSection } from '../components/CommentSection'
import { Card, CardTitle, Cover, ErrorBanner } from '../components/ui'
import { groupRatingLabel, isSameClubBook } from '../lib/bookStatus'
import { friendlyFirebaseError } from '../lib/errors'
import { resolveCurrentBook, saveHistoryComment } from '../lib/store'
import { useClub } from '../lib/useClub'
import { useClubHistory } from '../lib/useClubHistory'
import type { HistoryBook, Member } from '../types'

export function HistoryPage() {
  const { code, uid, displayName, state, error, setError } = useClub()
  const { books, ready, error: historyError } = useClubHistory(uid && displayName ? code : null)

  if (!uid || !displayName || !state) return null

  const current = resolveCurrentBook(state)
  const past = books.filter((book) => !current || !isSameClubBook(book, current))

  return (
    <>
      <ErrorBanner message={historyError ?? error} />
      {!ready ? (
        <p className="text-sm text-ink/65">Loading past books…</p>
      ) : past.length === 0 ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Nothing finished yet</CardTitle>
          <p className="text-sm text-ink/65">
            Finished books land here with ratings and comments.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {past.map((book) => (
            <li key={book.id}>
              <HistoryBookCard
                book={book}
                members={state.members}
                onSave={(text) => saveHistoryComment(code, book.id, uid, text)}
                onError={(err) => setError(friendlyFirebaseError(err))}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function HistoryBookCard({
  book,
  members,
  onSave,
  onError,
}: {
  book: HistoryBook
  members: Member[]
  onSave: (text: string) => Promise<void>
  onError: (err: unknown) => void
}) {
  const comments = Object.entries(book.notes ?? {})
    .map(([id, text]) => ({
      id,
      name: members.find((member) => member.id === id)?.displayName ?? 'Reader',
      text: text.trim(),
    }))
    .filter((row) => row.text.length > 0)
  const finished =
    book.finishedAt > 0
      ? new Date(book.finishedAt).toLocaleDateString(undefined, {
          month: 'short',
          year: 'numeric',
        })
      : null

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Cover src={book.coverUrl} title={book.title} className="h-28 w-[4.5rem]" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl break-words">{book.title}</p>
          <p className="text-sm text-ink/70">{book.author}</p>
          <p className="mt-1 text-sm font-semibold text-burgundy">
            {groupRatingLabel(book.ratings)}
          </p>
          {finished ? <p className="text-xs text-ink/50">{finished}</p> : null}
        </div>
      </div>
      <CommentSection
        comments={comments}
        ariaLabel={`Your comment on ${book.title}`}
        onSave={onSave}
        onError={onError}
      />
    </Card>
  )
}
