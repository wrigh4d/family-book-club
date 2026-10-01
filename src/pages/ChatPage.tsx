import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  CardTitle,
  ErrorBanner,
  TextInput,
} from '../components/ui'
import { loadOlderMessages, sendChatMessage, subscribeRecentMessages } from '../lib/chat'
import { CHAT_TEXT_MAX, formatChatTime, mergeChatMessages, validateChatText } from '../lib/chatFormat'
import { friendlyFirebaseError } from '../lib/errors'
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
  return (
    <ChatRoom
      key={code}
      code={code}
      uid={uid}
      displayName={displayName}
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
  const [ready, setReady] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [pushState, setPushState] = useState<PushAvailability>(pushAvailability)
  const [pushNote, setPushNote] = useState<string | null>(null)
  const liveOldest = useRef<QueryDocumentSnapshot | null>(null)
  const earlierCursor = useRef<QueryDocumentSnapshot | null>(null)
  const historyExhausted = useRef(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)
  const anchorHeight = useRef<number | null>(null)

  useEffect(() => {
    return subscribeRecentMessages(
      code,
      (page) => {
        setMessages((current) => mergeChatMessages(current, page.messages))
        setReady(true)
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
    try {
      validateChatText(snapshot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Write a message first.')
      return
    }
    setBusy(true)
    setError(null)
    setDraft('')
    stickToBottom.current = true
    try {
      await sendChatMessage(code, uid, displayName, snapshot)
    } catch (err) {
      setDraft(snapshot)
      setError(friendlyFirebaseError(err))
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
    <div className="flex flex-col gap-3">
      <ErrorBanner message={error} />
      <PushNotice
        state={pushState}
        note={pushNote}
        iosInstall={iosNeedsHomeScreen()}
        onEnable={() => void handleEnablePush()}
      />
      <div
        ref={scrollerRef}
        onScroll={() => {
          const scroller = scrollerRef.current
          if (!scroller) return
          stickToBottom.current =
            scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80
        }}
        className="flex max-h-[calc(100dvh-18rem)] min-h-64 flex-col gap-3 overflow-y-auto"
      >
        {hasMore ? (
          <Button
            type="button"
            variant="ghost"
            disabled={loadingEarlier}
            onClick={() => void handleEarlier()}
          >
            {loadingEarlier ? 'Loading…' : 'Earlier messages'}
          </Button>
        ) : null}
        {!ready ? <p className="text-sm text-ink/70">Loading messages…</p> : null}
        {ready && messages.length === 0 ? (
          <Card className="flex flex-col gap-3">
            <CardTitle>No messages yet</CardTitle>
            <p className="text-sm text-ink/70">Say hello. Everyone in the club can see this room.</p>
          </Card>
        ) : null}
        {messages.length > 0 ? (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {messages.map((message) => (
              <MessageRow key={message.id} message={message} mine={message.authorId === uid} />
            ))}
          </ul>
        ) : null}
      </div>
      <form onSubmit={(event) => void handleSend(event)} className="sticky bottom-0 flex gap-2 bg-cream pt-1">
        <TextInput
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={CHAT_TEXT_MAX}
          placeholder="Message the club"
          aria-label="Message"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || draft.trim().length === 0}>
          Send
        </Button>
      </form>
    </div>
  )
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
}) {
  if (state === 'dev') return null
  return (
    <Card className="flex flex-col gap-3">
      {state === 'granted' ? (
        <p className="text-sm text-ink/70">Notifications are on for this phone.</p>
      ) : null}
      {state === 'unconfigured' ? (
        <p className="text-sm text-ink/70">
          Messages work now. Phone notifications still need a Firebase web push key on this site.
        </p>
      ) : null}
      {state === 'unsupported' ? (
        <>
          <p className="text-sm text-ink/70">
            {note ?? 'This browser could not turn notifications on.'}
          </p>
          <Button type="button" variant="ghost" onClick={onEnable}>
            Try again
          </Button>
        </>
      ) : null}
      {state === 'denied' ? (
        <p className="text-sm text-ink/70">
          Notifications are blocked for this site. Turn them on in the phone settings, then come back.
        </p>
      ) : null}
      {state === 'default' ? (
        <>
          <p className="text-sm text-ink/70">
            Get a ping when someone sends a message, even if the club is closed.
            {iosInstall
              ? ' On an iPhone, add the site to your Home Screen and open it from that icon first.'
              : ''}
          </p>
          <Button type="button" variant="ghost" onClick={onEnable}>
            Enable notifications
          </Button>
        </>
      ) : null}
    </Card>
  )
}
