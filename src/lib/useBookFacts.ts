import {useEffect, useState} from 'react'
import {formatBookFacts} from './bookMeta'
import {fetchWorkFacts} from './openLibrary'

export function useBookFacts(book: {
    olid?: string | null
    genre?: string | null
    firstPublishYear?: number | null
    pageCount?: number | null
} | null): string {
    const [fetched, setFetched] = useState<{
        firstPublishYear: number | null
        pageCount: number | null
    } | null>(null)

    useEffect(() => {
        if (!book?.olid) {
            setFetched(null)
            return
        }
        if (book.firstPublishYear && book.pageCount) {
            setFetched(null)
            return
        }
        let cancelled = false
        fetchWorkFacts(book.olid)
            .then((facts) => {
                if (!cancelled) setFetched(facts)
            })
            .catch(() => {
                if (!cancelled) setFetched(null)
            })
        return () => {
            cancelled = true
        }
    }, [book?.olid, book?.firstPublishYear, book?.pageCount])

    if (!book) return ''
    return formatBookFacts({
        genre: book.genre,
        firstPublishYear: book.firstPublishYear ?? fetched?.firstPublishYear,
        pageCount: book.pageCount ?? fetched?.pageCount,
    })
}
