import type { ChatMessage } from '../types'

export const CHAT_TEXT_MAX = 1000
export const CHAT_PAGE_SIZE = 100

export function validateChatText(raw: string): string {
  const text = raw.trim()
  if (!text) throw new Error('Write a message first.')
  if (text.length > CHAT_TEXT_MAX) throw new Error('That message is too long.')
  return text
}

export function formatChatTime(millis: number, now = Date.now(), locale?: string): string {
  const date = new Date(millis)
  const today = new Date(now)
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  const time = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  if (sameDay) return time
  const day = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  return `${day}, ${time}`
}

function timestampPart(value: object, key: string): number | null {
  if (!(key in value)) return null
  const part = (value as Record<string, unknown>)[key]
  return typeof part === 'number' && Number.isFinite(part) ? part : null
}

function asMillis(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (!value || typeof value !== 'object') return null
  if ('toMillis' in value && typeof value.toMillis === 'function') {
    const millis = value.toMillis()
    if (typeof millis === 'number' && Number.isFinite(millis)) return millis
  }
  const seconds = timestampPart(value, 'seconds') ?? timestampPart(value, '_seconds')
  if (seconds == null) return null
  const nanos = timestampPart(value, 'nanoseconds') ?? timestampPart(value, '_nanoseconds') ?? 0
  return seconds * 1000 + nanos / 1e6
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function asChatMessage(id: string, data: Record<string, unknown>): ChatMessage | null {
  const authorId = asText(data.authorId)
  const authorName = asText(data.authorName)
  const text = asText(data.text)
  const createdAt = asMillis(data.createdAt)
  if (!id || !authorId || !authorName || !text || createdAt == null) return null
  return { id, authorId, authorName, text, createdAt }
}

export function mergeChatMessages(earlier: ChatMessage[], live: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const message of earlier) byId.set(message.id, message)
  for (const message of live) byId.set(message.id, message)
  return [...byId.values()].sort(
    (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
  )
}

export function isChatUnread(
  latestAt: number | null,
  seenAt: number,
  viewingChat: boolean,
): boolean {
  if (viewingChat || latestAt == null) return false
  return latestAt > seenAt
}

export function chatSeenStorageKey(uid: string, code: string): string {
  return `family-book-club:chat-seen:${uid}:${code}`
}

export function readChatSeen(
  storage: Pick<Storage, 'getItem'>,
  uid: string,
  code: string,
): number {
  const value = Number(storage.getItem(chatSeenStorageKey(uid, code)))
  return Number.isFinite(value) ? value : 0
}

export function writeChatSeen(
  storage: Pick<Storage, 'setItem'>,
  uid: string,
  code: string,
  at: number,
): void {
  storage.setItem(chatSeenStorageKey(uid, code), String(at))
}
