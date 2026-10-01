import { describe, expect, it } from 'vitest'
import { chatPageUrl, notificationBody, NOTIFICATION_BODY_MAX } from '../../functions/src/text.ts'
import {
  asChatMessage,
  CHAT_TEXT_MAX,
  chatSeenStorageKey,
  formatChatTime,
  isChatUnread,
  mergeChatMessages,
  readChatSeen,
  validateChatText,
  writeChatSeen,
} from './chatFormat'

describe('validateChatText', () => {
  it('trims a message', () => {
    expect(validateChatText('  hello  ')).toBe('hello')
  })

  it('rejects an empty message', () => {
    expect(() => validateChatText('   ')).toThrow(/Write a message/)
  })

  it('rejects a message over 1000 characters', () => {
    expect(() => validateChatText('a'.repeat(CHAT_TEXT_MAX + 1))).toThrow(/too long/)
  })
})

describe('formatChatTime', () => {
  const now = new Date(2026, 8, 30, 18, 0).getTime()

  it('shows the time when the message is from today', () => {
    const sameDay = new Date(2026, 8, 30, 15, 42).getTime()
    const label = formatChatTime(sameDay, now, 'en-US')
    expect(label).toBe('3:42 PM')
  })

  it('shows the date and time on another day', () => {
    const yesterday = new Date(2026, 8, 29, 15, 42).getTime()
    expect(formatChatTime(yesterday, now, 'en-US')).toBe('Sep 29, 3:42 PM')
  })
})

describe('notificationBody', () => {
  it('names the sender', () => {
    expect(notificationBody('Dad', 'Has anyone started?')).toBe('Dad: Has anyone started?')
  })

  it('trims a long alert to 140 characters', () => {
    const body = notificationBody('Dad', 'x'.repeat(200))
    expect(body).toHaveLength(NOTIFICATION_BODY_MAX)
    expect(body.endsWith('…')).toBe(true)
    expect(body.startsWith('Dad: ')).toBe(true)
  })
})

describe('chatPageUrl', () => {
  it('builds a GitHub Pages chat link', () => {
    expect(chatPageUrl('https://ada.github.io', '/family-book-club/', 'AB3K7Q')).toBe(
      'https://ada.github.io/family-book-club/club/AB3K7Q/chat',
    )
  })

  it('builds a local chat link when the base is the site root', () => {
    expect(chatPageUrl('http://localhost:4173', '/', 'AB3K7Q')).toBe(
      'http://localhost:4173/club/AB3K7Q/chat',
    )
  })
})

describe('asChatMessage', () => {
  it('reads a stored message', () => {
    expect(
      asChatMessage('m1', {
        authorId: 'uid',
        authorName: 'Dad',
        text: 'Hi',
        createdAt: { toMillis: () => 50 },
      }),
    ).toEqual({ id: 'm1', authorId: 'uid', authorName: 'Dad', text: 'Hi', createdAt: 50 })
  })

  it('reads a timestamp stored as seconds and nanoseconds', () => {
    expect(
      asChatMessage('m1', {
        authorId: 'uid',
        authorName: 'Dad',
        text: 'Hi',
        createdAt: { seconds: 1, nanoseconds: 500_000_000 },
      })?.createdAt,
    ).toBe(1500)
  })

  it('drops a document that is missing a sender or a time', () => {
    expect(asChatMessage('m1', { text: 'Hi' })).toBeNull()
    expect(asChatMessage('m1', { authorId: 'uid', authorName: 'Dad', text: 'Hi' })).toBeNull()
  })
})

describe('mergeChatMessages', () => {
  it('keeps the live copy when the same message is loaded twice', () => {
    const earlier = [
      { id: 'a', authorId: 'u', authorName: 'Dad', text: 'old', createdAt: 1 },
      { id: 'b', authorId: 'u', authorName: 'Dad', text: 'stale', createdAt: 2 },
    ]
    const live = [{ id: 'b', authorId: 'u', authorName: 'Mom', text: 'fresh', createdAt: 2 }]
    expect(mergeChatMessages(earlier, live).map((message) => message.text)).toEqual([
      'old',
      'fresh',
    ])
  })

  it('keeps an outgoing message when the latest page is still empty', () => {
    const outgoing = [{ id: 'local', authorId: 'u', authorName: 'Dad', text: 'hello', createdAt: 5 }]
    expect(mergeChatMessages(outgoing, []).map((message) => message.text)).toEqual(['hello'])
  })

  it('keeps a message that has slid out of the latest page', () => {
    const shown = [
      { id: 'm21', authorId: 'u', authorName: 'Dad', text: 'boundary', createdAt: 21 },
      { id: 'm22', authorId: 'u', authorName: 'Dad', text: 'kept', createdAt: 22 },
    ]
    const latestPage = [
      { id: 'm22', authorId: 'u', authorName: 'Dad', text: 'kept', createdAt: 22 },
      { id: 'm121', authorId: 'u', authorName: 'Mom', text: 'new', createdAt: 121 },
    ]
    expect(mergeChatMessages(shown, latestPage).map((message) => message.id)).toEqual([
      'm21',
      'm22',
      'm121',
    ])
  })
})

describe('chat seen state', () => {
  it('marks the room unread until it has been opened', () => {
    expect(isChatUnread(20, 10, false)).toBe(true)
    expect(isChatUnread(20, 20, false)).toBe(false)
    expect(isChatUnread(20, 10, true)).toBe(false)
    expect(isChatUnread(null, 0, false)).toBe(false)
  })

  it('stores the last opened time for that person and club', () => {
    const saved = new Map<string, string>()
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value)
      },
    }
    expect(readChatSeen(storage, 'uid', 'AB3K7Q')).toBe(0)
    writeChatSeen(storage, 'uid', 'AB3K7Q', 42)
    expect(saved.get(chatSeenStorageKey('uid', 'AB3K7Q'))).toBe('42')
    expect(readChatSeen(storage, 'uid', 'AB3K7Q')).toBe(42)
  })
})


