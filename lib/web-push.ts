import webpush from 'web-push'

const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidEmail      = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com'

// Configure VAPID lazily on first send, not at module load. Configuring at import
// time crashes any build/route that merely imports this module when the VAPID env
// vars are absent (e.g. local builds without secrets).
let vapidReady = false
function ensureVapid(): boolean {
  if (vapidReady) return true
  if (!vapidPublicKey || !vapidPrivateKey) return false
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
  vapidReady = true
  return true
}

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
  if (!ensureVapid()) return { success: false, expired: false }
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
