import { useState } from 'react'
import { Button, Card, CardTitle, Cover, ErrorBanner, Subhead, TextArea } from '../components/ui'
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
        <p className="text-sm text-ink/70">Loading past books…</p>
      ) : past.length === 0 ? (
        <Card className="flex flex-col gap-3">
          <CardTitle>Nothing finished yet</CardTitle>
          <p className="text-sm text-ink/70">
            After you conclude a meeting, that book will show up here with ratings and comments.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {past.map((book) => (
            <li key={book.id}>
              <HistoryBookCard
                book={book}
                members={state.members}
                uid={uid}
                onSave={async (text) => {
                  try {
                    await saveHistoryComment(code, book.id, uid, text)
                  } catch (err) {
                    setError(friendlyFirebaseError(err))
                  }
                }}
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
  uid,
  onSave,
}: {
  book: HistoryBook
  members: Member[]
  uid: string
  onSave: (text: string) => Promise<void>
}) {
  const remote = (book.notes?.[uid] ?? '').trim()
  const [draft, setDraft] = useState(remote)
  const [busy, setBusy] = useState(false)
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

  async function handleSave() {
    setBusy(true)
    try {
      await onSave(draft)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex gap-3">
        <Cover src={book.coverUrl} title={book.title} className="h-28 w-[4.5rem]" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl">{book.title}</p>
          <p className="text-sm text-ink/70">{book.author}</p>
          <p className="mt-1 text-sm font-semibold text-burgundy">
            {groupRatingLabel(book.ratings)}
          </p>
          {finished ? <p className="text-xs text-ink/50">{finished}</p> : null}
        </div>
      </div>
      <div>
        <Subhead>Comments</Subhead>
        {comments.length === 0 ? (
          <p className="mb-3 text-sm text-ink/70">No comments yet.</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-3">
            {comments.map((row) => (
              <li key={row.id} className="rounded-xl bg-cream px-3 py-2">
                <p className="text-xs font-semibold text-ink/60">{row.name}</p>
                <p className="whitespace-pre-wrap text-sm">{row.text}</p>
              </li>
            ))}
          </ul>
        )}
        <TextArea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="A thought on this book — optional"
          aria-label={`Your comment on ${book.title}`}
        />
        <div className="mt-2 flex justify-end">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void handleSave()}>
            Save comment
          </Button>
        </div>
      </div>
    </Card>
  )
}
