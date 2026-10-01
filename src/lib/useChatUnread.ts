import { useEffect, useState } from 'react'
import { firebaseErrorCode } from './errors'
import { isChatUnread, readChatSeen, writeChatSeen } from './chatFormat'
import { subscribeLatestChatMessage } from './chat'

function quietChatError(error: Error): void {
  const code = firebaseErrorCode(error)
  if (code === 'permission-denied' || code === 'failed-precondition') return
  console.error(error)
}

export function useChatUnread(code: string, uid: string | null, pathname: string): boolean {
  const [latest, setLatest] = useState<{ code: string; at: number | null }>({ code: '', at: null })
  const viewingChat = Boolean(code) && pathname === `/club/${code}/chat`
  const latestAt = latest.code === code ? latest.at : null
  const seenAt =
    uid && code && typeof localStorage !== 'undefined' ? readChatSeen(localStorage, uid, code) : 0

  useEffect(() => {
    if (!uid || !code) return
    return subscribeLatestChatMessage(
      code,
      (message) => setLatest({ code, at: message?.createdAt ?? null }),
      quietChatError,
    )
  }, [uid, code])

  useEffect(() => {
    if (!viewingChat || !uid || !code || latestAt == null || typeof localStorage === 'undefined') {
      return
    }
    if (latestAt > readChatSeen(localStorage, uid, code)) {
      writeChatSeen(localStorage, uid, code, latestAt)
    }
  }, [viewingChat, uid, code, latestAt])

  if (!uid) return false
  return isChatUnread(latestAt, seenAt, viewingChat)
}
