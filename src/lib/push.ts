import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'
import { chatPageUrl } from '../../functions/src/text.ts'
import { app, db } from './firebase'

export type PushAvailability = 'dev' | 'unsupported' | 'unconfigured' | 'default' | 'denied' | 'granted'

function vapidKey(): string {
  return import.meta.env.VITE_FIREBASE_VAPID_KEY || ''
}

export function pushAvailability(): PushAvailability {
  if (!import.meta.env.PROD) return 'dev'
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported'
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported'
  if (!vapidKey()) return 'unconfigured'
  return Notification.permission
}

export function iosNeedsHomeScreen(): boolean {
  if (typeof navigator === 'undefined') return false
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (!ios) return false
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  return !standalone
}

async function tokenDocId(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 40)
}

async function messagingRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!(await isSupported())) return null
  return navigator.serviceWorker.register(`${import.meta.env.BASE_URL}firebase-messaging-sw.js`, {
    type: 'module',
    scope: import.meta.env.BASE_URL,
  })
}

async function saveToken(uid: string, token: string): Promise<void> {
  const id = await tokenDocId(token)
  await setDoc(doc(db, 'users', uid, 'fcmTokens', id), {
    token,
    origin: window.location.origin,
    base: import.meta.env.BASE_URL,
    updatedAt: serverTimestamp(),
  })
}

async function ensurePushSubscription(uid: string): Promise<boolean> {
  if (pushAvailability() !== 'granted') return false
  const registration = await messagingRegistration()
  if (!registration) return false
  const token = await getToken(getMessaging(app), {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: registration,
  })
  if (!token) return false
  await saveToken(uid, token)
  return true
}

let chatPath = '/'
let listenEpoch = 0
let listeningUid: string | null = null
let stopListening: () => void = () => {}
let inflight: { uid: string; promise: Promise<boolean> } | null = null

export function setPushPath(pathname: string): void {
  chatPath = pathname
}

export function detachForegroundListener(): void {
  listenEpoch += 1
  inflight = null
  stopListening()
  stopListening = () => {}
  listeningUid = null
}

export function attachForegroundListener(uid: string): Promise<boolean> {
  if (listeningUid === uid) return Promise.resolve(true)
  if (inflight?.uid === uid) return inflight.promise

  listenEpoch += 1
  const epoch = listenEpoch
  stopListening()
  stopListening = () => {}
  listeningUid = null
  inflight = null

  const promise = startForegroundListener(uid, epoch)
  inflight = { uid, promise }
  return promise.finally(() => {
    if (inflight?.promise === promise) inflight = null
  })
}

async function startForegroundListener(uid: string, epoch: number): Promise<boolean> {
  const ready = await ensurePushSubscription(uid)
  if (epoch !== listenEpoch) return false
  if (!ready) return false
  const stop = await listenForForegroundMessages((payload) => {
    showForegroundNotification(payload, chatPath)
  })
  if (epoch !== listenEpoch) {
    stop?.()
    return false
  }
  if (!stop) return false
  listeningUid = uid
  stopListening = stop
  return true
}

export async function enablePush(uid: string): Promise<PushAvailability> {
  const availability = pushAvailability()
  if (
    availability === 'dev' ||
    availability === 'unsupported' ||
    availability === 'unconfigured' ||
    availability === 'denied'
  ) {
    return availability
  }
  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission === 'denied') return 'denied'
  if (permission !== 'granted') return 'default'
  const saved = await attachForegroundListener(uid)
  return saved ? 'granted' : 'unsupported'
}

export function showForegroundNotification(payload: MessagePayload, pathname: string): void {
  const clubCode = payload.data?.clubCode ?? ''
  const viewingThisChat = Boolean(clubCode) && pathname === `/club/${clubCode}/chat`
  if (viewingThisChat && document.visibilityState === 'visible') return
  const title = payload.notification?.title || 'Book club'
  const body = payload.notification?.body || 'New message'
  const notification = new Notification(title, {
    body,
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
  })
  if (!clubCode) return
  notification.onclick = () => {
    window.focus()
    window.location.assign(chatPageUrl(window.location.origin, import.meta.env.BASE_URL, clubCode))
  }
}

export async function listenForForegroundMessages(
  onPayload: (payload: MessagePayload) => void,
): Promise<(() => void) | null> {
  if (pushAvailability() !== 'granted') return null
  if (!(await isSupported())) return null
  return onMessage(getMessaging(app), onPayload)
}
