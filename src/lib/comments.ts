import type { BookComment, Member } from '../types'

export type CommentDisplay = {
  id: string
  name: string
  text: string
  at: number
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim()
}

function asAt(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function newCommentId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Parse a comments array; ignore malformed rows. */
export function parseCommentList(value: unknown): BookComment[] {
  if (!Array.isArray(value)) return []
  const out: BookComment[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const data = row as Record<string, unknown>
    const text = asTrimmed(data.text)
    if (!text) continue
    const uid = asTrimmed(data.uid) || 'unknown'
    out.push({
      id: asTrimmed(data.id) || `legacy-${uid}-${out.length}`,
      uid,
      name: asTrimmed(data.name) || 'Reader',
      text,
      at: asAt(data.at),
    })
  }
  return out
}

/**
 * Migrate Firestore history payload to a flat comments list.
 * Prefers `comments[]`; falls back to legacy `notes: Record<uid, string>`
 * as one-item lists per member.
 */
export function migrateBookComments(data: {
  comments?: unknown
  notes?: unknown
}): BookComment[] {
  const fromArray = parseCommentList(data.comments)
  if (fromArray.length > 0) return fromArray

  const notes = data.notes
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return []

  const migrated: BookComment[] = []
  for (const [uid, value] of Object.entries(notes as Record<string, unknown>)) {
    // Legacy shape was string; also accept accidental {text, at} objects.
    let text = ''
    let at = 0
    if (typeof value === 'string') {
      text = value.trim()
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const row = value as Record<string, unknown>
      text = asTrimmed(row.text)
      at = asAt(row.at)
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          const t = item.trim()
          if (t) {
            migrated.push({
              id: `legacy-${uid}-${migrated.length}`,
              uid,
              name: 'Reader',
              text: t,
              at: 0,
            })
          }
          continue
        }
        if (item && typeof item === 'object') {
          const row = item as Record<string, unknown>
          const t = asTrimmed(row.text)
          if (!t) continue
          migrated.push({
            id: asTrimmed(row.id) || `legacy-${uid}-${migrated.length}`,
            uid,
            name: asTrimmed(row.name) || 'Reader',
            text: t,
            at: asAt(row.at),
          })
        }
      }
      continue
    }
    if (!text) continue
    migrated.push({
      id: `legacy-${uid}`,
      uid,
      name: 'Reader',
      text,
      at,
    })
  }
  return migrated
}

/** Append one comment (pure); does not mutate the input list. */
export function appendBookComment(
  existing: BookComment[],
  input: { uid: string; name: string; text: string; at?: number; id?: string },
): BookComment[] {
  const text = input.text.trim()
  if (!text) return [...existing]
  const comment: BookComment = {
    id: input.id?.trim() || newCommentId(),
    uid: input.uid,
    name: input.name.trim() || 'Reader',
    text,
    at: input.at ?? Date.now(),
  }
  return [...existing, comment]
}

/** Newest first; stable by id when timestamps tie. */
export function sortCommentsNewestFirst(comments: BookComment[]): BookComment[] {
  return [...comments].sort((a, b) => b.at - a.at || b.id.localeCompare(a.id))
}

/** Resolve display names from members when stored name is missing/generic. */
export function commentsForDisplay(
  comments: BookComment[],
  members: Member[],
): CommentDisplay[] {
  const byId = new Map(members.map((member) => [member.id, member.displayName]))
  return sortCommentsNewestFirst(comments)
    .map((row) => {
      const text = row.text.trim()
      if (!text) return null
      const memberName = byId.get(row.uid)?.trim()
      const name =
        memberName ||
        (row.name.trim() && row.name.trim() !== 'Reader' ? row.name.trim() : null) ||
        memberName ||
        row.name.trim() ||
        'Reader'
      return { id: row.id, name, text, at: row.at }
    })
    .filter((row): row is CommentDisplay => row != null)
}
