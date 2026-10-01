import { initializeApp } from 'firebase-admin/app'
import { getFirestore, type DocumentReference } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { logger } from 'firebase-functions'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { chatPageUrl, iconUrl, notificationBody } from './text'

initializeApp()

const DEAD_TOKEN = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

type Target = {
  token: string
  ref: DocumentReference
  link?: string
  icon?: string
}

export const notifyChatMessage = onDocumentCreated(
  'clubs/{clubId}/messages/{messageId}',
  async (event) => {
    const snap = event.data
    if (!snap) return
    const data = snap.data()
    const authorId = typeof data.authorId === 'string' ? data.authorId : ''
    const authorName =
      typeof data.authorName === 'string' && data.authorName.trim() ? data.authorName.trim() : 'Someone'
    const text = typeof data.text === 'string' ? data.text.trim() : ''
    if (!authorId || !text) return

    const clubId = event.params.clubId
    const db = getFirestore()
    const club = await db.doc(`clubs/${clubId}`).get()
    const clubName = club.get('name')
    const title = typeof clubName === 'string' && clubName.trim() ? clubName.trim() : 'Book club'
    const members = await db.collection(`clubs/${clubId}/members`).get()
    const recipients = members.docs.filter((member) => member.id !== authorId)
    const tokenSnaps = await Promise.all(
      recipients.map((member) => db.collection(`users/${member.id}/fcmTokens`).get()),
    )
    const targets: Target[] = []

    tokenSnaps.forEach((tokens) => {
      if (!tokens) return
      for (const row of tokens.docs) {
        const token = row.get('token')
        if (typeof token !== 'string' || !token) continue
        const origin = row.get('origin')
        const base = row.get('base')
        let link: string | undefined
        let icon: string | undefined
        if (typeof origin === 'string' && typeof base === 'string') {
          try {
            link = chatPageUrl(origin, base, clubId)
            icon = iconUrl(origin, base)
          } catch {
            link = undefined
          }
        }
        targets.push({ token, ref: row.ref, link, icon })
      }
    })

    if (targets.length === 0) return

    const body = notificationBody(authorName, text)
    const messaging = getMessaging()
    for (let start = 0; start < targets.length; start += 500) {
      const batch = targets.slice(start, start + 500)
      const response = await messaging.sendEach(
        batch.map((target) => ({
          token: target.token,
          notification: { title, body },
          data: { clubCode: clubId },
          webpush: {
            fcmOptions: target.link ? { link: target.link } : undefined,
            notification: target.icon ? { icon: target.icon } : undefined,
          },
        })),
      )
      const removals: Array<Promise<unknown>> = []
      response.responses.forEach((result, index) => {
        if (result.success) return
        const code = result.error?.code ?? ''
        logger.warn('Chat notification failed', { clubId, code })
        const target = batch[index]
        if (target && DEAD_TOKEN.has(code)) removals.push(target.ref.delete())
      })
      await Promise.all(removals)
    }
  },
)
