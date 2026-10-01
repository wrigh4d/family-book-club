// Canonical notification copy and chat links. The website imports this module
// so a tap opens the same address the push payload uses.

export const NOTIFICATION_BODY_MAX = 140

export function notificationBody(authorName: string, text: string): string {
  const body = `${authorName}: ${text}`
  if (body.length <= NOTIFICATION_BODY_MAX) return body
  return `${body.slice(0, NOTIFICATION_BODY_MAX - 1)}…`
}

export function chatPageUrl(origin: string, base: string, code: string): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const root = new URL(normalizedBase, origin.endsWith('/') ? origin : `${origin}/`)
  return new URL(`club/${encodeURIComponent(code)}/chat`, root).href
}

export function iconUrl(origin: string, base: string): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const root = new URL(normalizedBase, origin.endsWith('/') ? origin : `${origin}/`)
  return new URL('icon-192.png', root).href
}
