import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
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
  return {
    messages,
    hasMore: false,
    oldest: docs.length > 0 ? (docs[docs.length - 1] ?? null) : null,
  }
}

export function subscribeRecentMessages(
  code: string,
  onData: (page: ChatPage) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  // Ordering by createdAt hides a message until the server timestamp is filled in,
  // so a refresh looks like the thread was erased. Read the whole room and sort here.
  return onSnapshot(
    messagesQuery(code),
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
  const page = pageFromDocs(snap.docs)
  return {
    messages: page.messages,
    hasMore: snap.docs.length === CHAT_PAGE_SIZE,
    oldest: snap.docs.length > 0 ? (snap.docs[snap.docs.length - 1] ?? null) : null,
  }
}

export function reserveChatMessageId(code: string): string {
  return doc(messagesQuery(code)).id
}

async function authorNameForSend(code: string, uid: string, fallback: string): Promise<string> {
  const name = fallback.trim()
  if (!name) throw new Error('Enter your name before chatting.')
  const memberRef = doc(db, 'clubs', code, 'members', uid)
  const memberSnap = await getDoc(memberRef)
  if (!memberSnap.exists()) throw new Error('Join this club before chatting.')
  const stored = memberSnap.data().displayName
  if (stored === name) return name
  await updateDoc(memberRef, { displayName: name })
  return name
}

export async function sendChatMessage(
  code: string,
  uid: string,
  authorName: string,
  raw: string,
  messageId: string,
): Promise<void> {
  const text = validateChatText(raw)
  const name = await authorNameForSend(code, uid, authorName)
  await setDoc(doc(messagesQuery(code), messageId), {
    authorId: uid,
    authorName: name,
    text,
    createdAt: serverTimestamp(),
  })
}
