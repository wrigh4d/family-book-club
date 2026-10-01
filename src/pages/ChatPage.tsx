import { type FormEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button, ErrorBanner, TextInput } from '../components/ui'
import {
  loadOlderMessages,
  reserveChatMessageId,
  sendChatMessage,
  subscribeRecentMessages,
} from '../lib/chat'
import {
  CHAT_TEXT_MAX,
  formatChatTime,
  mergeChatMessages,
  validateChatText,
} from '../lib/chatFormat'
import { firebaseErrorCode, friendlyFirebaseError } from '../lib/errors'
import {
  attachForegroundListener,
  enablePush,
  iosNeedsHomeScreen,
  pushAvailability,
  type PushAvailability,
} from '../lib/push'
import { useClub } from '../lib/useClub'
import type { ChatMessage } from '../types'
import type { QueryDocumentSnapshot } from 'firebase/firestore'

export function ChatPage() {
  const { code, uid, displayName, state, error, setError } = useClub()
  if (!uid || !displayName || !state || !code) return null
  const memberName =
    state.members.find((member) => member.id === uid)?.displayName.trim() || displayName
  return (
    <ChatRoom
      key={code}
      code={code}
      uid={uid}
      displayName={memberName}
      error={error}
      setError={setError}
    />
  )
}

function ChatRoom({
  code,
  uid,
  displayName,
  error,
  setError,
}: {
  code: string
  uid: string
  displayName: string
  error: string | null
  setError: (message: string | null) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [pushState, setPushState] = useState<PushAvailability>(pushAvailability)
  const [pushNote, setPushNote] = useState<string | null>(null)
  const liveOldest = useRef<QueryDocumentSnapshot | null>(null)
  const earlierCursor = useRef<QueryDocumentSnapshot | null>(null)
  const historyExhausted = useRef(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const stickToBottom = useRef(true)
  const anchorHeight = useRef<number | null>(null)

  useLayoutEffect(() => {
    const scroller = pageRef.current?.closest('main')
    if (!scroller) return
    scrollerRef.current = scroller
    const onScroll = () => {
      stickToBottom.current =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    return subscribeRecentMessages(
      code,
      (page) => {
        setMessages((current) => mergeChatMessages(current, page.messages))
        liveOldest.current = page.oldest
        if (!historyExhausted.current && !earlierCursor.current) setHasMore(page.hasMore)
      },
      (err) => setError(friendlyFirebaseError(err)),
    )
  }, [code, setError])

  useEffect(() => {
    if (pushAvailability() !== 'granted') return
    let cancelled = false
    void attachForegroundListener(uid)
      .then((saved) => {
        if (!cancelled) setPushState(saved ? 'granted' : 'unsupported')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setPushState('unsupported')
        setPushNote(friendlyFirebaseError(err))
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  const messageStamp = `${messages.length}:${messages[0]?.id ?? ''}:${messages.at(-1)?.id ?? ''}`

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (anchorHeight.current != null) {
      scroller.scrollTop += scroller.scrollHeight - anchorHeight.current
      anchorHeight.current = null
      return
    }
    if (stickToBottom.current) scroller.scrollTop = scroller.scrollHeight
  }, [messageStamp])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const snapshot = draft
    const name = displayName.trim()
    let text: string
    try {
      text = validateChatText(snapshot)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Write a message first.')
      return
    }
    if (!name) {
      setSendError('Enter your name before chatting.')
      return
    }
    const messageId = reserveChatMessageId(code)
    const optimistic: ChatMessage = {
      id: messageId,
      authorId: uid,
      authorName: name,
      text,
      createdAt: Date.now(),
    }
    setBusy(true)
    setSendError(null)
    setError(null)
    setDraft('')
    setMessages((current) => mergeChatMessages(current, [optimistic]))
    stickToBottom.current = true
    try {
      await sendChatMessage(code, uid, name, text, messageId)
    } catch (err) {
      setMessages((current) => current.filter((message) => message.id !== messageId))
      setDraft(snapshot)
      setSendError(chatSendError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleEarlier() {
    const cursor = earlierCursor.current ?? liveOldest.current
    if (!cursor) return
    anchorHeight.current = scrollerRef.current?.scrollHeight ?? null
    stickToBottom.current = false
    setLoadingEarlier(true)
    try {
      const page = await loadOlderMessages(code, cursor)
      if (page.oldest) earlierCursor.current = page.oldest
      if (!page.hasMore) historyExhausted.current = true
      setMessages((current) => mergeChatMessages(current, page.messages))
      setHasMore(page.hasMore)
    } catch (err) {
      anchorHeight.current = null
      setError(friendlyFirebaseError(err))
    } finally {
      setLoadingEarlier(false)
    }
  }

  async function handleEnablePush() {
    setPushNote(null)
    try {
      setPushState(await enablePush(uid))
    } catch (err) {
      setPushState('unsupported')
      setPushNote(friendlyFirebaseError(err))
    }
  }

  return (
    <div ref={pageRef} className="flex flex-1 flex-col gap-3">
      <ErrorBanner message={error} />
      <PushNotice
        state={pushState}
        note={pushNote}
        iosInstall={iosNeedsHomeScreen()}
        onEnable={() => void handleEnablePush()}
      />
      <div className="flex flex-1 flex-col gap-3">
        {hasMore ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loadingEarlier}
            onClick={() => void handleEarlier()}
          >
            {loadingEarlier ? 'Loading…' : 'Earlier messages'}
          </Button>
        ) : null}
        {messages.length > 0 ? (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} mine={message.authorId === uid} />
            ))}
          </ul>
        ) : (
          <p className="pointer-events-none m-auto max-w-sm text-center text-sm text-ink/70">
            No messages yet. Say hello — everyone in the club can see this room.
          </p>
        )}
      </div>
      <div className="sticky bottom-0 z-10 mt-auto shrink-0 bg-cream">
        <ErrorBanner message={sendError} />
        <form onSubmit={(event) => void handleSend(event)} className="flex gap-2 py-3">
          <TextInput
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (sendError) setSendError(null)
            }}
            maxLength={CHAT_TEXT_MAX}
            placeholder="Message the club"
            aria-label="Message"
            enterKeyHint="send"
            className="min-w-0 flex-1"
            disabled={busy}
          />
          <Button
            type="submit"
            size="sm"
            className="shrink-0 self-stretch"
            disabled={busy || draft.trim().length === 0}
            onMouseDown={(event) => event.preventDefault()}
          >
            {busy ? 'Sending…' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  )
}

function chatSendError(error: unknown): string {
  const code = firebaseErrorCode(error)
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : ''
  if (code === 'permission-denied' || /insufficient permissions/i.test(message)) {
    return "Couldn't send that message. Firestore rejected it for this club."
  }
  return friendlyFirebaseError(error)
}

function MessageRow({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          mine ? 'bg-burgundy text-cream' : 'border border-rule bg-paper text-ink'
        }`}
      >
        <p className={`text-xs font-semibold ${mine ? 'text-cream/80' : 'text-ink/60'}`}>
          {message.authorName}
          {' · '}
          <time dateTime={new Date(message.createdAt).toISOString()}>
            {formatChatTime(message.createdAt)}
          </time>
        </p>
        <p className="whitespace-pre-wrap text-sm">{message.text}</p>
      </div>
    </li>
  )
}

function PushNotice({
  state,
  note,
  iosInstall,
  onEnable,
}: {
  state: PushAvailability
  note: string | null
  iosInstall: boolean
  onEnable: () => void
}): ReactNode {
  switch (state) {
    case 'dev':
      return null
    case 'granted':
      return <PushBanner message="Notifications are on for this phone." />
    case 'unconfigured':
      return (
        <PushBanner message="Phone notifications still need a Firebase web push key on this site." />
      )
    case 'unsupported':
      return (
        <PushBanner
          message={note ?? 'This browser could not turn notifications on.'}
          action={
            <Button type="button" variant="ghost" size="sm" onClick={onEnable}>
              Try again
            </Button>
          }
        />
      )
    case 'denied':
      return (
        <PushBanner message="Notifications are blocked for this site. Turn them on in the phone settings, then come back." />
      )
    case 'default':
      return (
        <PushBanner
          message={`Get a ping when someone sends a message, even if the club is closed.${
            iosInstall
              ? ' On an iPhone, add the site to your Home Screen and open it from that icon first.'
              : ''
          }`}
          action={
            <Button type="button" variant="ghost" size="sm" onClick={onEnable}>
              Enable
            </Button>
          }
        />
      )
    default: {
      const unreachable: never = state
      return unreachable
    }
  }
}

function PushBanner({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-rule bg-paper px-3 py-2">
      <p className="text-sm text-ink/70">{message}</p>
      {action}
    </div>
  )
}
