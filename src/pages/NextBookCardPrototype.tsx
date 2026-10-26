import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookRow } from '../components/bookSearch'
import { PrototypeSwitcher, type PrototypeVariant } from '../components/PrototypeSwitcher'
import { Button, Card, CardTitle, Cover, TextButton, TextInput } from '../components/ui'

// Three ways to show club genre preferences and one shortlist draw
// on the Next book card. Sample card, no sign-in. PROTOTYPE, throwaway.

const VARIANTS: PrototypeVariant[] = [
  { id: 'A', name: 'Chips and a row' },
  { id: 'B', name: 'Scoreboard and cover' },
  { id: 'C', name: 'Bars and a ticket' },
]

type GenreCount = { genre: string; count: number }
type SampleBook = { title: string; author: string }

const GENRE_COUNTS: GenreCount[] = [
  { genre: 'Fantasy', count: 4 },
  { genre: 'Mystery', count: 3 },
  { genre: 'Historical', count: 2 },
  { genre: 'Science Fiction', count: 1 },
]

const SHORTLIST: SampleBook[] = [
  { title: 'Piranesi', author: 'Susanna Clarke' },
  { title: 'The Thursday Murder Club', author: 'Richard Osman' },
  { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin' },
]

export default function NextBookCardPrototype() {
  const [params, setParams] = useSearchParams()
  const variant = params.get('variant') ?? 'A'
  const owner = params.get('role') !== 'member'
  const booksOn = params.get('books') !== 'none'
  const genresOn = params.get('genres') !== 'none'
  const counts = genresOn ? GENRE_COUNTS : []
  const books = booksOn ? SHORTLIST : []
  const [index, setIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const drawn = books.length > 0 && !(variant === 'C' && dismissed) ? books[index % books.length] : null

  function setFlag(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
    setIndex(0)
    setDismissed(false)
    setChosen(null)
  }

  function choose(book: SampleBook) {
    setChosen(book.title)
  }

  function skipRow() {
    if (books.length === 0) return
    setChosen(null)
    setIndex((current) => (current + 1) % books.length)
  }

  const genreState = counts.length
    ? counts.map((row) => `${row.genre} ${row.count}`).join(', ')
    : 'no genre preferences'
  const drawState = drawn ? `drawn ${drawn.title}` : 'draw hidden'

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 py-8 pb-28">
      <p className="text-xs font-semibold tracking-wide text-burgundy uppercase">
        Prototype · {owner ? 'owner' : 'member'} · {genreState} · {drawState}
        {chosen ? ` · chose ${chosen}` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-full border border-ink/20 px-3 py-2 text-sm font-semibold"
          onClick={() => setFlag('role', owner ? 'member' : 'owner')}
        >
          View as {owner ? 'member' : 'owner'}
        </button>
        <button
          type="button"
          className="rounded-full border border-ink/20 px-3 py-2 text-sm font-semibold"
          onClick={() => setFlag('books', booksOn ? 'none' : 'some')}
        >
          {booksOn ? 'Hide shortlist' : 'Show shortlist'}
        </button>
        <button
          type="button"
          className="rounded-full border border-ink/20 px-3 py-2 text-sm font-semibold"
          onClick={() => setFlag('genres', genresOn ? 'none' : 'some')}
        >
          {genresOn ? 'Hide genre counts' : 'Show genre counts'}
        </button>
      </div>
      <Card className="flex flex-col gap-4">
        <CardTitle>Next book</CardTitle>
        {variant === 'B' ? (
          <ScoreboardAndCover
            owner={owner}
            counts={counts}
            books={books}
            drawn={drawn}
            onChoose={choose}
            onSkip={skipRow}
          />
        ) : null}
        {variant === 'C' ? (
          <BarsAndTicket
            owner={owner}
            counts={counts}
            books={books}
            drawn={drawn}
            onChoose={choose}
            onSkip={() => {
              setChosen(null)
              setDismissed(true)
            }}
            onDraw={() => setDismissed(false)}
          />
        ) : null}
        {variant === 'A' ? (
          <ChipsAndRow
            owner={owner}
            counts={counts}
            books={books}
            drawn={drawn}
            onChoose={choose}
            onSkip={skipRow}
          />
        ) : null}
      </Card>
      <PrototypeSwitcher variants={VARIANTS} />
    </main>
  )
}

function ChipsAndRow({
  owner,
  counts,
  books,
  drawn,
  onChoose,
  onSkip,
}: {
  owner: boolean
  counts: GenreCount[]
  books: SampleBook[]
  drawn: SampleBook | null
  onChoose: (book: SampleBook) => void
  onSkip: () => void
}) {
  return (
    <>
      <GenreChips counts={counts} />
      {drawn ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-ink/85">From the shortlist</p>
          <ul>
            <BookRow
              coverUrl={null}
              title={drawn.title}
              author={drawn.author}
              action={
                owner ? (
                  <div className="flex items-center justify-end gap-3">
                    <TextButton onClick={onSkip}>Skip</TextButton>
                    <Button type="button" size="sm" onClick={() => onChoose(drawn)}>
                      Choose
                    </Button>
                  </div>
                ) : null
              }
            />
          </ul>
        </div>
      ) : null}
      <PickerRest books={books} />
    </>
  )
}

function ScoreboardAndCover({
  owner,
  counts,
  books,
  drawn,
  onChoose,
  onSkip,
}: {
  owner: boolean
  counts: GenreCount[]
  books: SampleBook[]
  drawn: SampleBook | null
  onChoose: (book: SampleBook) => void
  onSkip: () => void
}) {
  return (
    <>
      <Scoreboard counts={counts} />
      {drawn ? (
        <div className="flex flex-col items-center px-2 text-center">
          <p className="text-xs font-semibold tracking-wide text-gold uppercase">From the shortlist</p>
          <Cover src={null} title={drawn.title} className="mt-3 h-56 w-36" />
          <p className="mt-3 font-display text-3xl leading-tight">{drawn.title}</p>
          <p className="mt-1 text-sm text-ink/70">{drawn.author}</p>
          {owner ? (
            <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
              <Button type="button" onClick={() => onChoose(drawn)}>
                Choose
              </Button>
              <Button type="button" variant="ghost" onClick={onSkip}>
                Skip
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-ink/85 outline-none">
          Shortlist · {books.length}
        </summary>
        <div className="mt-3">
          <PickerRest books={books} heading={false} />
        </div>
      </details>
    </>
  )
}

function BarsAndTicket({
  owner,
  counts,
  books,
  drawn,
  onChoose,
  onSkip,
  onDraw,
}: {
  owner: boolean
  counts: GenreCount[]
  books: SampleBook[]
  drawn: SampleBook | null
  onChoose: (book: SampleBook) => void
  onSkip: () => void
  onDraw: () => void
}) {
  const max = counts.reduce((highest, row) => Math.max(highest, row.count), 1)
  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-ink/85">Club genre preferences</p>
        {counts.length === 0 ? (
          <p className="text-sm text-ink/65">No club genre preferences yet.</p>
        ) : (
          counts.map((row) => (
            <div key={row.genre}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{row.genre}</span>
                <span className="tabular-nums text-burgundy">{row.count}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-cream">
                <div
                  className="h-2 rounded-full bg-burgundy"
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
      {drawn ? (
        <div className="rounded-2xl bg-cream px-4 py-4">
          <div className="flex gap-3">
            <Cover src={null} title={drawn.title} className="h-24 w-16" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-gold uppercase">
                One from the shortlist
              </p>
              <p className="mt-1 font-display text-2xl leading-tight">{drawn.title}</p>
              <p className="text-sm text-ink/70">{drawn.author}</p>
            </div>
          </div>
          {owner ? (
            <div className="mt-3 flex items-center gap-3">
              <Button type="button" size="sm" onClick={() => onChoose(drawn)}>
                Choose
              </Button>
              <TextButton onClick={onSkip}>Skip</TextButton>
            </div>
          ) : null}
        </div>
      ) : owner && books.length > 0 ? (
        <TextButton onClick={onDraw}>Draw one</TextButton>
      ) : null}
      <PickerRest books={books} />
    </>
  )
}

function GenreChips({ counts }: { counts: GenreCount[] }) {
  if (counts.length === 0) {
    return <p className="text-sm text-ink/65">No club genre preferences yet.</p>
  }
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-ink/85">Club genre preferences</p>
      <div className="flex flex-wrap gap-1.5">
        {counts.map((row) => (
          <span
            key={row.genre}
            className="inline-flex min-h-7 items-center gap-1 rounded-full border border-gold/40 bg-cream/90 px-2.5 py-0.5 text-xs"
          >
            <span className="font-medium text-ink">{row.genre}</span>
            <span className="tabular-nums text-burgundy">{row.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Scoreboard({ counts }: { counts: GenreCount[] }) {
  if (counts.length === 0) {
    return <p className="text-sm text-ink/65">No club genre preferences yet.</p>
  }
  return (
    <ol className="flex flex-col">
      {counts.map((row) => (
        <li
          key={row.genre}
          className="flex items-baseline justify-between gap-3 border-b border-rule/80 py-2"
        >
          <span className="font-display text-2xl">{row.genre}</span>
          <span className="font-display text-4xl leading-none text-burgundy tabular-nums">
            {row.count}
          </span>
        </li>
      ))}
    </ol>
  )
}

function PickerRest({ books, heading = true }: { books: SampleBook[]; heading?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {heading ? <p className="text-sm font-semibold text-ink/85">Shortlist</p> : null}
      {books.length === 0 ? (
        <p className="text-sm text-ink/65">Shortlist is empty. Search below or nominate first.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {books.map((book) => (
            <BookRow key={book.title} coverUrl={null} title={book.title} author={book.author} />
          ))}
        </ul>
      )}
      <p className="text-sm font-semibold text-ink/85">Search</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <TextInput
          value=""
          readOnly
          placeholder="Search title or author"
          aria-label="Search title or author"
          className="min-w-0 sm:flex-1"
        />
        <Button type="button" variant="ghost" size="sm" className="sm:shrink-0">
          Search
        </Button>
      </div>
    </div>
  )
}
