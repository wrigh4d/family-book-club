export type BookSearchHit = {
  olid: string
  title: string
  author: string
  coverUrl: string | null
}

type OpenLibraryDoc = {
  key?: string
  title?: string
  author_name?: string[]
  cover_i?: number
}

type OpenLibrarySearch = {
  docs?: OpenLibraryDoc[]
}

export async function searchBooks(query: string): Promise<BookSearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Could not search Open Library.')
  const data = (await res.json()) as OpenLibrarySearch

  return (data.docs ?? [])
    .filter((doc) => doc.title && doc.key)
    .map((doc) => ({
      olid: doc.key as string,
      title: doc.title as string,
      author: doc.author_name?.[0] ?? 'Unknown author',
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
    }))
}
