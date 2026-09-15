import type { SupabaseClient } from '@supabase/supabase-js'
import type { FullGame, FullInning, FullSeason, GameResult } from '@/types'
import {
  addDays, getWeekStart, getWeekEnd, getFirstRealWeekStart, inningNumber,
  effectiveOuts, simulateRuns, gameResult,
} from './game-logic'

// Brings a season's stored innings in line with the rules of play. Shared by the
// app (on every load) and the daily server job (for players who stop opening
// the app), so both enforce exactly the same thing:
//
//   * Every past day exists. A day you never opened is a loss.
//   * An in-progress inning closes 48 hours after its day ends...
//   * ...unless the player re-opened it, which grants a fresh 48 hours.

export const EDIT_WINDOW_DAYS = 2
const REOPEN_WINDOW_MS = 48 * 60 * 60 * 1000

/** True while a re-opened inning is still inside its fresh 48-hour window. */
export function inReopenWindow(inning: Pick<FullInning, 'reopened_at'>, now: Date): boolean {
  if (!inning.reopened_at) return false
  return now.getTime() - new Date(inning.reopened_at).getTime() < REOPEN_WINDOW_MS
}

/** The result an inning gets when it's closed as it stands. */
export function closingResult(inning: FullInning): GameResult {
  if (effectiveOuts(inning) < 3) return 'LOSS'
  return simulateRuns(inning.offense_goals) > 0 ? 'WIN' : 'TIE'
}

/** Last calendar day of a season with a planned length, or null. */
export function seasonLastDay(season: Pick<FullSeason, 'start_date' | 'length_weeks'>): string | null {
  return season.length_weeks
    ? addDays(getFirstRealWeekStart(season.start_date), season.length_weeks * 7 - 1)
    : null
}

/** A calendar date (YYYY-MM-DD) in the given IANA timezone; UTC if unknown. */
export function localDateIn(tz: string | null | undefined, at: Date = new Date()): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
  try { return format(tz || 'UTC') } catch { return format('UTC') }
}

function groupIds<T extends string>(pairs: { id: string; key: T }[]): Map<T, string[]> {
  const out = new Map<T, string[]>()
  for (const { id, key } of pairs) {
    const arr = out.get(key)
    if (arr) arr.push(id); else out.set(key, [id])
  }
  return out
}

/**
 * What rolls into a new day: yesterday's unfinished goals plus any lines the
 * player wrote under "plan tomorrow", minus anything the day already has.
 */
export function carryForwardGoals(
  prev: Pick<FullInning, 'offense_goals' | 'future_goals'> | undefined,
  existingGoalTexts: string[],
): { goal: string; hit_type: FullInning['offense_goals'][number]['hit_type'] }[] {
  if (!prev) return []
  const have = new Set(existingGoalTexts.map(t => t.trim().toLowerCase()))
  const out: { goal: string; hit_type: FullInning['offense_goals'][number]['hit_type'] }[] = []
  const add = (goal: string, hit_type: FullInning['offense_goals'][number]['hit_type']) => {
    const key = goal.trim().toLowerCase()
    if (!key || have.has(key)) return
    have.add(key)
    out.push({ goal: goal.trim(), hit_type })
  }
  for (const og of prev.offense_goals) if (!og.completed) add(og.goal, og.hit_type)
  for (const line of (prev.future_goals ?? '').split('\n')) add(line, 'single')
  return out
}

export interface ReconcileResult { backfilled: number; closed: number }

/**
 * Reconciles `season` in place (games and innings are mutated to match what
 * was written) and returns how much changed. Writes are batched — a constant
 * handful of requests regardless of how long the player was away.
 *
 * Requires the unique indexes from migration 028.
 */
export async function reconcileSeason(
  supabase: SupabaseClient,
  season: FullSeason,
  opts: { userId: string; localToday: string; now?: Date },
): Promise<ReconcileResult> {
  const now    = opts.now ?? new Date()
  const nowIso = now.toISOString()
  const cutoff = addDays(opts.localToday, -EDIT_WINDOW_DAYS)
  const result: ReconcileResult = { backfilled: 0, closed: 0 }
  const touchedGames = new Set<string>()

  // ── 1. Backfill days that were never opened ─────────────────────────────────
  const lastDay  = seasonLastDay(season)
  const fillUpTo = lastDay && lastDay < cutoff ? lastDay : cutoff

  const seen = new Set<string>()
  for (const g of season.games) for (const i of g.innings) seen.add(i.date)

  const missing: string[] = []
  for (let d = season.start_date; d <= fillUpTo; d = addDays(d, 1)) {
    if (!seen.has(d)) missing.push(d)
  }

  if (missing.length > 0) {
    const weeks = Array.from(new Set(missing.map(getWeekStart)))
    const stamp = Date.now()

    const needGames = weeks.filter(ws => !season.games.some(g => g.week_start === ws))
    if (needGames.length > 0) {
      // Ignore conflicts: another tab (or the server job) may have just made it.
      await supabase.from('games').upsert(
        needGames.map(ws => ({
          id: 'g_' + ws + '_' + stamp, user_id: opts.userId, season_id: season.id,
          week_start: ws, week_end: getWeekEnd(ws),
        })),
        { onConflict: 'season_id,week_start', ignoreDuplicates: true },
      )
      const { data: rows } = await supabase.from('games').select('*').eq('season_id', season.id)
      for (const row of rows ?? []) {
        if (!season.games.some(g => g.id === row.id)) season.games.push({ ...row, innings: [] } as FullGame)
      }
    }

    const gameByWeek = new Map(season.games.map(g => [g.week_start, g]))
    // Every backfilled day is already past the edit window, so it's recorded
    // closed as a loss straight away. Re-open still works on it.
    const newRows = missing.flatMap(d => {
      const game = gameByWeek.get(getWeekStart(d))
      if (!game) return []
      return [{
        id: 'i_' + d + '_bf' + stamp, user_id: opts.userId, game_id: game.id, date: d,
        inning_number: inningNumber(d), target_goals: 5,
        mind_task: '',   mind_completed:   false,
        spirit_task: '', spirit_completed: false,
        body_task: '',   body_completed:   false,
        reflection: '', future_goals: '',
        status: 'CLOSED', result: 'LOSS', closed_at: nowIso,
        is_rain_delay: false, pinch_hit_used: false, carried_forward: true,
      }]
    })

    if (newRows.length > 0) {
      const { data: inserted } = await supabase.from('innings')
        .upsert(newRows, { onConflict: 'game_id,date', ignoreDuplicates: true })
        .select()
      for (const inn of inserted ?? []) {
        const game = season.games.find(g => g.id === inn.game_id)
        if (!game) continue
        game.innings.push({ ...inn, offense_goals: [] })
        touchedGames.add(game.id)
        result.backfilled++
      }
    }
  }

  // ── 2. Close innings whose edit window has passed ───────────────────────────
  const closures: { id: string; key: GameResult; inning: FullInning; gameId: string }[] = []
  for (const game of season.games) {
    for (const inning of game.innings) {
      if (inning.status !== 'IN_PROGRESS') continue
      if (inning.date > cutoff) continue
      if (inReopenWindow(inning, now)) continue
      closures.push({ id: inning.id, key: closingResult(inning), inning, gameId: game.id })
    }
  }

  for (const [res, ids] of Array.from(groupIds(closures))) {
    const { error } = await supabase.from('innings')
      .update({ status: 'CLOSED', result: res, closed_at: nowIso })
      .in('id', ids)
    if (error) continue
    for (const c of closures) {
      if (c.key !== res) continue
      c.inning.status = 'CLOSED'
      c.inning.result = res
      c.inning.closed_at = nowIso
      touchedGames.add(c.gameId)
      result.closed++
    }
  }

  // ── 3. Refresh the result of every game that changed ────────────────────────
  const gameUpdates: { id: string; key: GameResult }[] = []
  for (const game of season.games) {
    if (!touchedGames.has(game.id)) continue
    game.innings.sort((a, b) => a.date.localeCompare(b.date))
    const next = gameResult(game.innings)
    if (next !== game.result) gameUpdates.push({ id: game.id, key: next })
  }
  for (const [res, ids] of Array.from(groupIds(gameUpdates))) {
    const { error } = await supabase.from('games').update({ result: res }).in('id', ids)
    if (error) continue
    for (const g of season.games) if (ids.includes(g.id)) g.result = res
  }

  season.games.sort((a, b) => a.week_start.localeCompare(b.week_start))
  return result
}
