import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPush } from '@/lib/web-push'
import { today, getPrevDate } from '@/lib/game-logic'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase   = createAdminClient()
  const todayStr   = today()
  const yestStr    = getPrevDate(todayStr)

  // Verify admin client works
  const { data: profilesCheck, error: profilesErr } = await supabase.from('profiles').select('id').limit(3)
  console.log('[cron/notify] profiles check:', profilesCheck?.length ?? 0, profilesErr?.message ?? null)

  // Load all subscriptions
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')

  console.log('[cron/notify] subs:', subs?.length ?? 0, 'error:', error?.message ?? null)
  if (error || !subs?.length) {
    return NextResponse.json({ sent: 0, total: 0, debug: { error: error?.message ?? null, subs: subs?.length ?? 0, profilesCheck: profilesCheck?.length ?? 0, profilesErr: profilesErr?.message ?? null } })
  }

  // Load profiles separately
  const userIds = subs.map(s => s.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds)
  const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) ?? [])

  // Load yesterday's innings for all subscribers in one query
  const { data: yestInnings } = await supabase
    .from('innings')
    .select('user_id, status')
    .in('user_id', userIds)
    .eq('date', yestStr)

  const yestMap = new Map(yestInnings?.map(i => [i.user_id, i.status]) ?? [])

  // Load current streaks — count consecutive WIN innings up to yesterday
  const { data: recentInnings } = await supabase
    .from('innings')
    .select('user_id, result, status, date')
    .in('user_id', userIds)
    .eq('status', 'CLOSED')
    .neq('result', 'IN_PROGRESS')
    .order('date', { ascending: false })
    .limit(userIds.length * 14)

  function getStreak(userId: string): number {
    const innings = (recentInnings ?? [])
      .filter(i => i.user_id === userId)
      .sort((a, b) => b.date.localeCompare(a.date))
    let streak = 0
    for (const inning of innings) {
      if (inning.result === 'WIN') streak++
      else break
    }
    return streak
  }

  let sent = 0
  const expired: string[] = []

  await Promise.allSettled(
    subs.map(async sub => {
      const firstName = profileMap.get(sub.user_id)?.split(' ')[0] ?? 'there'
      const yestStatus = yestMap.get(sub.user_id)
      const streak = getStreak(sub.user_id)

      let title: string
      let body: string

      if (yestStatus === 'IN_PROGRESS') {
        // Yesterday's inning was never closed
        title = '📋 Yesterday is still open'
        body  = streak > 0
          ? `Close out yesterday and protect your ${streak}-day streak, ${firstName}!`
          : `Wrap up yesterday's inning and start fresh today, ${firstName}.`
      } else if (streak >= 3) {
        title = `🔥 ${streak}-day streak — keep it going!`
        body  = `Win today's inning and extend your streak, ${firstName}. You're on a roll.`
      } else {
        title = '⚾ Time to win today\'s inning'
        body  = `Good morning, ${firstName}! Set your goals and go get those 3 outs.`
      }

      const result = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { title, body, url: '/', tag: 'wti-daily' }
      )

      if (result.success) {
        sent++
      } else if (result.expired) {
        expired.push(sub.endpoint)
      }
    })
  )

  // Clean up expired subscriptions
  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired)
  }

  return NextResponse.json({ sent, total: subs.length, expired: expired.length })
}
