import { NextResponse }      from 'next/server'
import { createClient }     from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPush }          from '@/lib/web-push'

export const runtime = 'nodejs'

const PRESET_LABELS: Record<string, string> = {
  lets_go:       "Let's go! 🔥",
  keep_it_up:    'Keep it up 💪',
  you_got_this:  'You got this ⚾',
  nice_work:     'Nice work! 🏆',
}

const MAX_MESSAGE_LENGTH  = 120
const MAX_NUDGES_PER_DAY  = 50

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    to_user_id:     string
    preset_key:     string
    custom_message: string | null
  }
  const { to_user_id, preset_key } = body

  const presetLabel = PRESET_LABELS[preset_key]
  if (typeof to_user_id !== 'string' || !to_user_id || !presetLabel) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const custom_message = typeof body.custom_message === 'string'
    ? body.custom_message.trim().slice(0, MAX_MESSAGE_LENGTH)
    : null

  const admin = createAdminClient()

  // Sender and recipient must be active members of the same team.
  const { data: memberships } = await admin
    .from('team_members')
    .select('user_id, team_id')
    .in('user_id', [user.id, to_user_id])
    .eq('status', 'active')
  const senderTeam    = memberships?.find(m => m.user_id === user.id)?.team_id
  const recipientTeam = memberships?.find(m => m.user_id === to_user_id)?.team_id
  if (!senderTeam || senderTeam !== recipientTeam) {
    return NextResponse.json({ error: 'Recipient is not on your team' }, { status: 403 })
  }

  // Per-sender daily cap (the nudges row is inserted by the client before this call).
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('nudges')
    .select('id', { count: 'exact', head: true })
    .eq('from_user_id', user.id)
    .gte('created_at', dayAgo)
  if ((count ?? 0) > MAX_NUDGES_PER_DAY) {
    return NextResponse.json({ error: 'Daily nudge limit reached' }, { status: 429 })
  }

  // Sender identity comes from their profile, never from the request body.
  const { data: sender } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()
  const fromName = sender?.display_name?.trim() || 'A teammate'

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', to_user_id)

  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const notifBody  = custom_message ? `${presetLabel} — ${custom_message}` : presetLabel
  const notifTitle = `${fromName} sent you a nudge`

  let sent = 0
  const expired: string[] = []

  await Promise.allSettled(subs.map(async sub => {
    const result = await sendPush(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      { title: notifTitle, body: notifBody, tag: 'nudge', url: '/?tab=social' }
    )
    if (result.success) sent++
    else if (result.expired) expired.push(sub.id)
  }))

  if (expired.length) {
    await admin.from('push_subscriptions').delete().in('id', expired)
  }

  return NextResponse.json({ sent })
}
