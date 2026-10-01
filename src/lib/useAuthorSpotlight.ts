import { useEffect, useState } from 'react'
import {
  resolveAuthorSpotlight,
  type AuthorSpotlight,
  type SpotlightBook,
} from './authorSpotlight'
import { fetchAuthorSpotlightFact } from './openLibrary'

export function useAuthorSpotlight(book: SpotlightBook | null): AuthorSpotlight {
  const [live, setLive] = useState<AuthorSpotlight | null>(null)

  useEffect(() => {
    if (!book?.olid) {
      setLive(null)
      return
    }
    let cancelled = false
    fetchAuthorSpotlightFact(book.olid)
      .then((fact) => {
        if (!cancelled) setLive(fact)
      })
      .catch(() => {
        if (!cancelled) setLive(null)
      })
    return () => {
      cancelled = true
    }
  }, [book?.olid])

  return resolveAuthorSpotlight(book, live)
}
