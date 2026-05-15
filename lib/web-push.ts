import webpush from 'web-push'

const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidEmail      = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com'

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)

export interface PushPayload {
  title: string
  body:  string
  tag?:  string
  url?:  string
}

export interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function sendPush(sub: PushSubscription, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      JSON.stringify(payload)
    )
    return { success: true, expired: false }
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 410 || status === 404) {
      return { success: false, expired: true }
    }
    return { success: false, expired: false }
  }
}

export { vapidPublicKey }
