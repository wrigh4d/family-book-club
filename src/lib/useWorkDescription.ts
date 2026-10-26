import { useEffect, useState } from 'react'
import { fetchWorkDescription } from './openLibrary'

export function useWorkDescription(olid: string | null): string | null {
  const [loaded, setLoaded] = useState<{ olid: string; text: string | null } | null>(null)

  useEffect(() => {
    if (!olid) return
    let cancelled = false
    fetchWorkDescription(olid)
      .then((value) => {
        if (!cancelled) setLoaded({ olid, text: value })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ olid, text: null })
      })
    return () => {
      cancelled = true
    }
  }, [olid])

  if (!olid || loaded?.olid !== olid) return null
  return loaded.text
}
