import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type { ChatMessage } from '../types'
import { asChatMessage, CHAT_PAGE_SIZE, validateChatText } from './chatFormat'
import { db } from './firebase'

export type ChatPage = {
  messages: ChatMessage[]
  hasMore: boolean
  oldest: QueryDocumentSnapshot | null
}

function messagesQuery(code: string) {
  return collection(db, 'clubs', code, 'messages')
}

function pageFromDocs(docs: QueryDocumentSnapshot[]): ChatPage {
  const messages: ChatMessage[] = []
  for (const row of docs) {
    const data = row.data() as Record<string, unknown>
    const message = asChatMessage(row.id, data)
    if (message) {
      messages.push(message)
      continue
    }
    if (!row.metadata.hasPendingWrites) continue
    const pending = asChatMessage(row.id, { ...data, createdAt: Date.now() })
    if (pending) messages.push(pending)
  }
  messages.reverse()
  return {
    messages,
    hasMore: docs.length === CHAT_PAGE_SIZE,
    oldest: docs.length > 0 ? (docs[docs.length - 1] ?? null) : null,
  }
}

export function subscribeRecentMessages(
  code: string,
  onData: (page: ChatPage) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const recent = query(messagesQuery(code), orderBy('createdAt', 'desc'), limit(CHAT_PAGE_SIZE))
  return onSnapshot(
    recent,
    (snap) => onData(pageFromDocs(snap.docs)),
    (error) => onError(error),
  )
}

export function subscribeLatestChatMessage(
  code: string,
  onData: (message: ChatMessage | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const latest = query(messagesQuery(code), orderBy('createdAt', 'desc'), limit(1))
  return onSnapshot(
    latest,
    (snap) => {
      const row = snap.docs[0]
      onData(row ? asChatMessage(row.id, row.data() as Record<string, unknown>) : null)
    },
    (error) => onError?.(error),
  )
}

export async function loadOlderMessages(
  code: string,
  oldest: QueryDocumentSnapshot,
): Promise<ChatPage> {
  const older = query(
    messagesQuery(code),
    orderBy('createdAt', 'desc'),
    startAfter(oldest),
    limit(CHAT_PAGE_SIZE),
  )
  const snap = await getDocs(older)
  return pageFromDocs(snap.docs)
}

export async function sendChatMessage(
  code: string,
  uid: string,
  authorName: string,
  raw: string,
): Promise<void> {
  const text = validateChatText(raw)
  const name = authorName.trim()
  if (!name) throw new Error('Enter your name before chatting.')
  await addDoc(messagesQuery(code), {
    authorId: uid,
    authorName: name,
    text,
    createdAt: serverTimestamp(),
  })
}
