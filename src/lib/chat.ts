import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  startAfter,
  Timestamp,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type { ChatMessage } from '../types'
import { asChatMessage, CHAT_PAGE_SIZE, recentChatPage, validateChatText } from './chatFormat'
import { db } from './firebase'

export type ChatPage = {
  messages: ChatMessage[]
  hasMore: boolean
  oldest: QueryDocumentSnapshot | null
}

function messagesQuery(code: string) {
  return collection(db, 'clubs', code, 'messages')
}

function messageFromDoc(row: QueryDocumentSnapshot): ChatMessage | null {
  const data = row.data() as Record<string, unknown>
  const message = asChatMessage(row.id, data)
  if (message) return message
  // A saved message with no readable time still belongs in the thread.
  const createdAt = row.metadata.hasPendingWrites ? Date.now() : 0
  return asChatMessage(row.id, { ...data, createdAt })
}

function pageFromDocs(docs: QueryDocumentSnapshot[]): ChatPage {
  const messages: ChatMessage[] = []
  for (const row of docs) {
    const message = messageFromDoc(row)
    if (message) messages.push(message)
  }
  messages.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  const page = recentChatPage(docs, CHAT_PAGE_SIZE)
  return {
    messages,
    hasMore: page.hasMore,
    oldest: page.oldest,
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

export function reserveChatMessageId(code: string): string {
  return doc(messagesQuery(code)).id
}

export async function sendChatMessage(
  code: string,
  uid: string,
  authorName: string,
  raw: string,
  messageId: string,
  createdAt: number,
): Promise<void> {
  const text = validateChatText(raw)
  const name = authorName.trim()
  if (!name) throw new Error('Enter your name before chatting.')
  await setDoc(doc(messagesQuery(code), messageId), {
    authorId: uid,
    authorName: name,
    text,
    createdAt: Timestamp.fromMillis(createdAt),
  })
}
