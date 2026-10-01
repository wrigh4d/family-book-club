import { CommentSection } from '../components/CommentSection'
import { Card, CardTitle, Cover, ErrorBanner } from '../components/ui'
import { groupRatingLabel, isSameClubBook } from '../lib/bookStatus'
import { commentsForDisplay } from '../lib/comments'
import { resolveCurrentBook } from '../lib/store'
import { useClub } from '../lib/useClub'
import type { HistoryBook, Member } from '../types'

export function HistoryPage() {
  const { uid, displayName, state, error } = useClub()

  if (!uid || !displayName || !state) return null

  // Full history rides on the club subscription (no second listener).
  const current = resolveCurrentBook(state)
  const past = state.history.filter((book) => !current || !isSameClubBook(book, current))

  return (
    <>
      <ErrorBanner message={error} />
      {past.length === 0 ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Nothing finished yet</CardTitle>
          <p className="text-sm text-ink/65">
            Finished books show ratings and comments here.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {past.map((book) => (
            <li key={book.id}>
              <HistoryBookCard book={book} members={state.members} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function HistoryBookCard({ book, members }: { book: HistoryBook; members: Member[] }) {
  const comments = commentsForDisplay(book.comments ?? [], members).map((row) => ({
    id: row.id,
    name: row.name,
    text: row.text,
    at: row.at,
  }))
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
      <CommentSection comments={comments} bookTitle={book.title} readOnly />
    </Card>
  )
}
