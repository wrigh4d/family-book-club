export function formatBookFacts(book: {
    genre?: string | null
    firstPublishYear?: number | null
    pageCount?: number | null
}): string {
    const parts: string[] = []
    if (book.genre) parts.push(book.genre)
    if (book.firstPublishYear) parts.push(String(book.firstPublishYear))
    if (book.pageCount) parts.push(`${book.pageCount} pages`)
    return parts.join(' · ')
}
