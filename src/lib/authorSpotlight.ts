/** Author quote or fun fact for Present secondary carousel. */

export type SpotlightKind = 'quote' | 'fact'

export type AuthorSpotlight = {
  kind: SpotlightKind
  text: string
  attribution: string
}

export type SpotlightBook = {
  olid?: string | null
  title?: string | null
  author?: string | null
}

type CuratedEntry = {
  kind: SpotlightKind
  text: string
  /** Optional work olid keys (with or without /works/). */
  olids?: string[]
}

const DEFAULT_SPOTLIGHT: AuthorSpotlight = {
  kind: 'fact',
  text: 'A good book club turns one story into many conversations.',
  attribution: 'Family Book Club',
}

/** Curated quotes and facts keyed by normalized author name. Free, offline fallback. */
const CURATED_BY_AUTHOR: Record<string, CuratedEntry> = {
  'mark twain': {
    kind: 'quote',
    text: 'The man who does not read has no advantage over the man who cannot read.',
  },
  'jane austen': {
    kind: 'quote',
    text: 'There is no charm equal to tenderness of heart.',
  },
  'roald dahl': {
    kind: 'quote',
    text: 'If you are going to get anywhere in life you have to work at it.',
  },
  'j r r tolkien': {
    kind: 'quote',
    text: 'Not all those who wander are lost.',
  },
  'jrr tolkien': {
    kind: 'quote',
    text: 'Not all those who wander are lost.',
  },
  'maya angelou': {
    kind: 'quote',
    text: 'There is no greater agony than bearing an untold story inside you.',
  },
  'toni morrison': {
    kind: 'quote',
    text: 'If there is a book that you want to read, but it has not been written yet, then you must write it.',
  },
  'george orwell': {
    kind: 'quote',
    text: 'In a time of deceit telling the truth is a revolutionary act.',
  },
  'agatha christie': {
    kind: 'quote',
    text: 'The best time to plan a book is while you are doing the dishes.',
  },
  'stephen king': {
    kind: 'quote',
    text: 'Books are a uniquely portable magic.',
  },
  'neil gaiman': {
    kind: 'quote',
    text: 'A book is a dream that you hold in your hand.',
  },
  'jk rowling': {
    kind: 'quote',
    text: 'It is our choices that show what we truly are, far more than our abilities.',
  },
  'j k rowling': {
    kind: 'quote',
    text: 'It is our choices that show what we truly are, far more than our abilities.',
  },
  'harper lee': {
    kind: 'quote',
    text: 'You never really understand a person until you consider things from his point of view.',
  },
  'c s lewis': {
    kind: 'quote',
    text: 'You can never get a cup of tea large enough or a book long enough to suit me.',
  },
  'cs lewis': {
    kind: 'quote',
    text: 'You can never get a cup of tea large enough or a book long enough to suit me.',
  },
  'emily dickinson': {
    kind: 'quote',
    text: 'There is no Frigate like a Book to take us Lands away.',
  },
  'oscar wilde': {
    kind: 'quote',
    text: 'It is what you read when you do not have to that determines what you will be when you cannot help it.',
  },
  'ray bradbury': {
    kind: 'quote',
    text: 'You do not have to burn books to destroy a culture. Just get people to stop reading them.',
  },
  'margaret atwood': {
    kind: 'quote',
    text: 'A word after a word after a word is power.',
  },
}

const CURATED_BY_OLID: Record<string, CuratedEntry> = {
  '/works/OL45804W': {
    kind: 'fact',
    text: 'Roald Dahl wrote Fantastic Mr Fox after a farmer complained about foxes on his land.',
    olids: ['/works/OL45804W', 'OL45804W'],
  },
}

export function normalizeAuthorKey(author: string): string {
  return author
    .toLowerCase()
    .normalize('NFKD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
    .replaceAll(/\s+/g, ' ')
}

export function normalizeWorkKey(olid: string): string {
  const raw = olid.trim()
  if (!raw) return ''
  return raw.startsWith('/') ? raw : `/works/${raw.replace(/^works\//, '')}`
}

function curatedFor(book: SpotlightBook): AuthorSpotlight | null {
  const olid = book.olid ? normalizeWorkKey(book.olid) : ''
  if (olid && CURATED_BY_OLID[olid]) {
    const row = CURATED_BY_OLID[olid]
    return {
      kind: row.kind,
      text: row.text,
      attribution: book.author?.trim() || book.title?.trim() || 'Open Library',
    }
  }
  const author = book.author?.trim()
  if (!author) return null
  const key = normalizeAuthorKey(author)
  const row = CURATED_BY_AUTHOR[key]
  if (!row) return null
  return { kind: row.kind, text: row.text, attribution: author }
}

/** Strip wiki/markdown noise and take a short first sentence for display. */
export function cleanBioSnippet(raw: string, maxLen = 160): string | null {
  let text = raw
    .replaceAll(/\[\d+\]/g, '')
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replaceAll(/\[\s*Source\s*\]\[[^\]]*\]\.?/gi, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
  if (!text) return null
  const sentence = text.split(/(?<=[.!?])\s+/)[0] ?? text
  text = sentence.trim()
  if (text.length > maxLen) {
    const cut = text.slice(0, maxLen - 1)
    const at = cut.lastIndexOf(' ')
    text = `${(at > 40 ? cut.slice(0, at) : cut).trim()}…`
  }
  if (text.length < 24) return null
  return text
}

export function funFactFromAuthor(author: {
  name?: string
  bio?: string | { value?: string } | null
  birth_date?: string | null
  death_date?: string | null
}): AuthorSpotlight | null {
  const name = author.name?.trim() || 'This author'
  const bioRaw =
    typeof author.bio === 'string' ? author.bio : (author.bio?.value ?? '')
  const snippet = cleanBioSnippet(bioRaw)
  if (snippet) {
    return { kind: 'fact', text: snippet, attribution: name }
  }
  const birth = author.birth_date?.trim()
  if (birth) {
    const death = author.death_date?.trim()
    const span = death ? `Born ${birth}, died ${death}.` : `Born ${birth}.`
    return { kind: 'fact', text: span, attribution: name }
  }
  return null
}

/**
 * Resolve spotlight for a book.
 * Prefer curated author/work entries, then a live Open Library fact, then default.
 */
export function resolveAuthorSpotlight(
  book: SpotlightBook | null | undefined,
  liveFact: AuthorSpotlight | null = null,
): AuthorSpotlight {
  if (!book) return DEFAULT_SPOTLIGHT
  const curated = curatedFor(book)
  if (curated) return curated
  if (liveFact) return liveFact
  if (book.author?.trim()) {
    return {
      kind: 'fact',
      text: `${book.author.trim()} wrote the book your club is reading now.`,
      attribution: book.author.trim(),
    }
  }
  return DEFAULT_SPOTLIGHT
}

export { DEFAULT_SPOTLIGHT }
