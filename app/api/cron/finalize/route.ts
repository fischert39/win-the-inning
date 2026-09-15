import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { reconcileSeason, localDateIn } from '@/lib/reconcile'
import type { FullSeason, FullGame, FullInning } from '@/types'

export const runtime = 'nodejs'

// Daily: brings every current season in line with the rules of play, for
// players who haven't opened the app. It applies exactly what the app does on
// load (lib/reconcile.ts): unopened days become losses, and innings close 48
// hours after their day — or 48 hours after a re-open — in the player's own
// timezone. Without this, a player who stops opening the app never records a
// loss, and team scoreboards flatter them.
//
// Lives under /api/cron so the sign-in middleware lets Vercel's cron request
// through. (The old /api/finalize-week was redirected to /login and never ran.)
export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: seasons, error } = await supabase
    .from('seasons')
    .select('*, season_goals(*), games(*, innings(*, offense_goals(*)))')
    .eq('is_current', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = Array.from(new Set((seasons ?? []).map(s => s.user_id as string)))
  const { data: profiles, error: profErr } = await supabase
    .from('profiles').select('id, timezone').in('id', userIds)
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })
  const tzByUser = new Map((profiles ?? []).map(p => [p.id as string, p.timezone as string | null]))

  let backfilled = 0, closed = 0, failed = 0

  for (const raw of (seasons ?? []) as FullSeason[]) {
    const season: FullSeason = {
      ...raw,
      games: (raw.games ?? []).map((g: FullGame) => ({
        ...g,
        innings: (g.innings ?? []).map((i: FullInning) => ({
          ...i,
          offense_goals: (i.offense_goals ?? []).sort((a, b) => a.sort_order - b.sort_order),
        })),
      })),
    }
    try {
      const r = await reconcileSeason(supabase, season, {
        userId:     season.user_id,
        localToday: localDateIn(tzByUser.get(season.user_id)),
      })
      backfilled += r.backfilled
      closed     += r.closed
    } catch {
      failed++
    }
  }

  return NextResponse.json({ seasons: seasons?.length ?? 0, backfilled, closed, failed })
}
