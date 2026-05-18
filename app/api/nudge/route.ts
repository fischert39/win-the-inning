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

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    to_user_id:     string
    preset_key:     string
    custom_message: string | null
    from_name:      string
  }
  const { to_user_id, preset_key, custom_message, from_name } = body

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', to_user_id)

  if (!subs?.length) return NextResponse.json({ sent: 0 })

  const presetLabel   = PRESET_LABELS[preset_key] ?? preset_key
  const notifBody     = custom_message ? `${presetLabel} — ${custom_message}` : presetLabel
  const notifTitle    = `${from_name} sent you a nudge`

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
