import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPush } from '@/lib/web-push'
import { today, addDays, getPrevDate, getWeekStart } from '@/lib/game-logic'

export const runtime = 'nodejs'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Send the daily reminder at this local hour. The endpoint is triggered every
// hour (GitHub Actions), and each run only notifies users whose local clock
// just hit this hour — so everyone gets it at 8am *their* time.
const TARGET_HOUR = 8

// Local calendar date (YYYY-MM-DD), day-of-week, and hour for an instant in a
// given IANA timezone. Falls back to UTC if the timezone is missing or invalid.
function localParts(d: Date, tz: string | null): { date: string; dow: number; hour: number } {
  const zone = tz || 'UTC'
  const fmt = (z: string) => {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: z, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
    const dow  = DOW.indexOf(new Intl.DateTimeFormat('en-US', { timeZone: z, weekday: 'short' }).format(d))
    const hour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: z, hour: '2-digit', hourCycle: 'h23' }).format(d), 10)
    return { date, dow, hour }
  }
  try { return fmt(zone) } catch { return fmt('UTC') }
}

interface InningRow { user_id: string; status: string; result: string; date: string; is_rain_delay: boolean }

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const now      = new Date()

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

  // Load profiles (name + timezone)
  const { data: profiles } = await supabase
    .from('profiles').select('id, display_name, timezone').in('id', userIds)
  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

  // One window covers everything we need: last week's recap + the streak lookback.
  // Timezones shift a user's local day by at most ~1 day vs UTC, so a 16-day
  // window over UTC dates safely includes each user's local last week.
  const { data: recent } = await supabase
    .from('innings')
    .select('user_id, status, result, date, is_rain_delay')
    .in('user_id', userIds)
    .gte('date', addDays(today(), -16))

  const byUser = new Map<string, InningRow[]>()
  for (const i of (recent ?? []) as InningRow[]) {
    const arr = byUser.get(i.user_id)
    if (arr) arr.push(i); else byUser.set(i.user_id, [i])
  }

  let sent = 0
  const expired: string[] = []

  await Promise.allSettled(subs.map(async sub => {
    const prof      = profileMap.get(sub.user_id)
    const firstName = prof?.display_name?.split(' ')[0] ?? 'there'
    const innings   = byUser.get(sub.user_id) ?? []

    // Each user's "today" in their own timezone.
    const { date: localToday, dow, hour } = localParts(now, prof?.timezone ?? null)

    // Only notify users whose local clock is at the target hour. Runs at other
    // hours skip them — the next hourly trigger will catch their timezone.
    if (hour !== TARGET_HOUR) return

    const localYesterday = getPrevDate(localToday)

    let title: string
    let body: string
    let tag = 'wti-daily'

    if (dow === 1) {
      // ── Monday (local): last week's recap ──
      tag = 'wti-weekly'
      const prevWeekEnd   = localYesterday               // last Sunday (local)
      const prevWeekStart = getWeekStart(prevWeekEnd)    // last Monday (local)
      let wins = 0, losses = 0
      for (const i of innings) {
        if (i.status !== 'CLOSED' || i.is_rain_delay) continue
        if (i.date < prevWeekStart || i.date > prevWeekEnd) continue
        if (i.result === 'WIN') wins++
        else if (i.result === 'LOSS') losses++
      }
      const played = innings.filter(i =>
        i.status === 'CLOSED' && !i.is_rain_delay && i.date >= prevWeekStart && i.date <= prevWeekEnd).length

      if (played === 0) {
        title = `⚾ New game, ${firstName}!`
        body  = `Fresh week — no innings last week. Today's inning 1 of a new game. Let's go!`
      } else if (wins >= 5) {
        title = `🏆 ${wins}-${losses} last week — let's go again!`
        body  = `Dominant performance, ${firstName}. See your full recap and start the new game strong.`
      } else if (wins >= 3) {
        title = `💪 ${wins}-${losses} last week, ${firstName}`
        body  = `Solid game. New week starts now — build on that momentum.`
      } else if (wins >= 1) {
        title = `⚾ ${wins}-${losses} last week, ${firstName}`
        body  = `Every win counts. Fresh game today — go get those outs.`
      } else {
        title = `📋 New game, ${firstName} — fresh start`
        body  = `Last week is done. Today is Inning 1 of a brand new game. Make it count.`
      }
    } else if (dow === 0) {
      // ── Sunday (local): plan the week ahead ──
      tag = 'wti-plan'
      const openInnings = innings.filter(i => i.status === 'IN_PROGRESS' && i.date <= localToday).length
      title = `🗓️ Set next week's lineup, ${firstName}`
      body  = openInnings > 0
        ? `Close out this week, then plan next week's goals — five minutes tonight saves you all week.`
        : `Take five minutes to plan next week. Goals lined up now means fewer decisions later.`
    } else {
      // ── Daily motivation ──
      const yestStatus = innings.find(i => i.date === localYesterday)?.status

      // Win streak: consecutive WINs from the most recent decided inning.
      const decided = innings
        .filter(i => i.status === 'CLOSED' && !i.is_rain_delay && i.result !== 'IN_PROGRESS')
        .sort((a, b) => b.date.localeCompare(a.date))
      let streak = 0
      for (const i of decided) { if (i.result === 'WIN') streak++; else break }

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
    }

    const result = await sendPush(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      { title, body, url: '/', tag }
    )
    if (result.success) sent++
    else if (result.expired) expired.push(sub.endpoint)
  }))

  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired)
  }
  return NextResponse.json({ sent, total: subs.length, expired: expired.length })
}
