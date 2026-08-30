import {type FormEvent, useState} from 'react'
import {type BookSearchHit, searchBooks} from './openLibrary'
import {friendlyFirebaseError} from './errors'

export function useBookSearch() {
    const [query, setQuery] = useState('')
    const [hits, setHits] = useState<BookSearchHit[]>([])
    const [searching, setSearching] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)

    async function runSearch(event: FormEvent) {
        event.preventDefault()
        setSearching(true)
        setSearchError(null)
        try {
            setHits(await searchBooks(query))
        } catch (err) {
            setSearchError(friendlyFirebaseError(err))
        } finally {
            setSearching(false)
        }
    }

    return {query, setQuery, hits, searching, searchError, runSearch}
}
