import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { effectiveOuts, simulateRuns, gameResult, getWeekStart, today } from '@/lib/game-logic'
import type { GameResult, FullInning, OffenseGoal } from '@/types'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const currentWeekStart = getWeekStart(today())
  const now = new Date().toISOString()

  // Fetch all IN_PROGRESS innings from past weeks (across all users)
  const { data: innings, error } = await supabase
    .from('innings')
    .select('*, offense_goals(*)')
    .eq('status', 'IN_PROGRESS')
    .lt('date', currentWeekStart)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const gameIds = new Set<string>()
  let finalized = 0

  for (const inning of (innings ?? []) as (FullInning & { offense_goals: OffenseGoal[] })[]) {
    const outs = effectiveOuts(inning)
    const runs = simulateRuns(inning.offense_goals ?? [])
    const result: GameResult = outs < 3 ? 'LOSS' : runs > 0 ? 'WIN' : 'TIE'

    await supabase
      .from('innings')
      .update({ status: 'CLOSED', result, closed_at: now })
      .eq('id', inning.id)

    gameIds.add(inning.game_id)
    finalized++
  }

  // Recalculate result for each affected game
  let gamesUpdated = 0
  for (const gameId of Array.from(gameIds)) {
    const { data: gameInnings } = await supabase
      .from('innings')
      .select('*, offense_goals(*)')
      .eq('game_id', gameId)

    if (gameInnings) {
      const result = gameResult(gameInnings as FullInning[])
      await supabase.from('games').update({ result }).eq('id', gameId)
      gamesUpdated++
    }
  }

  return NextResponse.json({ finalized, gamesUpdated })
}
