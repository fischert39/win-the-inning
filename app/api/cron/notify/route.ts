import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPush } from '@/lib/web-push'
import { today, getPrevDate, getWeekStart } from '@/lib/game-logic'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase    = createAdminClient()
  const todayStr    = today()
  const yestStr     = getPrevDate(todayStr)
  const isMonday    = new Date().getUTCDay() === 1

  // Load all subscriptions via direct REST (bypasses JS client issues)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const subsRes = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?select=user_id,endpoint,p256dh,auth`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  const subs: { user_id: string; endpoint: string; p256dh: string; auth: string }[] | null =
    subsRes.ok ? await subsRes.json() : null

  if (!subs?.length) return NextResponse.json({ sent: 0, total: 0 })

  const userIds = subs.map(s => s.user_id)

  // Load profiles
  const { data: profiles } = await supabase
    .from('profiles').select('id, display_name').in('id', userIds)
  const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) ?? [])

  // ── MONDAY: last week's recap ─────────────────────────────────────────────
  if (isMonday) {
    const prevWeekEnd   = getPrevDate(todayStr)           // last Sunday
    const prevWeekStart = getWeekStart(prevWeekEnd)       // last Monday

    // Fetch all closed innings from last week for subscribers
    const { data: weekInnings } = await supabase
      .from('innings')
      .select('user_id, result')
      .in('user_id', userIds)
      .eq('status', 'CLOSED')
      .gte('date', prevWeekStart)
      .lte('date', prevWeekEnd)

    // Per-user win/loss/tie counts
    const weekMap = new Map<string, { wins: number; losses: number; ties: number }>()
    for (const i of weekInnings ?? []) {
      const cur = weekMap.get(i.user_id) ?? { wins: 0, losses: 0, ties: 0 }
      if (i.result === 'WIN')  cur.wins++
      else if (i.result === 'LOSS') cur.losses++
      else if (i.result === 'TIE')  cur.ties++
      weekMap.set(i.user_id, cur)
    }

    let sent = 0
    const expired: string[] = []

    await Promise.allSettled(subs.map(async sub => {
      const firstName = profileMap.get(sub.user_id)?.split(' ')[0] ?? 'there'
      const w = weekMap.get(sub.user_id) ?? { wins: 0, losses: 0, ties: 0 }
      const played = w.wins + w.losses + w.ties

      let title: string
      let body: string

      if (played === 0) {
        title = `⚾ New game, ${firstName}!`
        body  = `Fresh week — no innings last week. Today's inning 1 of a new game. Let's go!`
      } else if (w.wins >= 5) {
        title = `🏆 ${w.wins}-${w.losses} last week — let's go again!`
        body  = `Dominant performance, ${firstName}. See your full recap and start the new game strong.`
      } else if (w.wins >= 3) {
        title = `💪 ${w.wins}-${w.losses} last week, ${firstName}`
        body  = `Solid game. New week starts now — build on that momentum.`
      } else if (w.wins >= 1) {
        title = `⚾ ${w.wins}-${w.losses} last week, ${firstName}`
        body  = `Every win counts. Fresh game today — go get those outs.`
      } else {
        title = `📋 New game, ${firstName} — fresh start`
        body  = `Last week is done. Today is Inning 1 of a brand new game. Make it count.`
      }

      const result = await sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        { title, body, url: '/', tag: 'wti-weekly' }
      )
      if (result.success) sent++
      else if (result.expired) expired.push(sub.endpoint)
    }))

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired)
    }
    return NextResponse.json({ sent, total: subs.length, expired: expired.length, type: 'monday-recap' })
  }

  // ── DAILY: existing motivation logic ─────────────────────────────────────
  const { data: yestInnings } = await supabase
    .from('innings').select('user_id, status').in('user_id', userIds).eq('date', yestStr)
  const yestMap = new Map(yestInnings?.map(i => [i.user_id, i.status]) ?? [])

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

  await Promise.allSettled(subs.map(async sub => {
    const firstName  = profileMap.get(sub.user_id)?.split(' ')[0] ?? 'there'
    const yestStatus = yestMap.get(sub.user_id)
    const streak     = getStreak(sub.user_id)

    let title: string
    let body: string

    if (yestStatus === 'IN_PROGRESS') {
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
    if (result.success) sent++
    else if (result.expired) expired.push(sub.endpoint)
  }))

  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired)
  }
  return NextResponse.json({ sent, total: subs.length, expired: expired.length, type: 'daily' })
}
