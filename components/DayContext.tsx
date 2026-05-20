'use client'

import { inningNumber } from '@/lib/game-logic'
import type { FullSeason } from '@/types'

interface Props {
  season:        FullSeason
  todayStr:      string
  sport:         'softball' | 'baseball'
  inningsPlayed: number
  inningsWon:    number
}

// ── Rotating flavor lines ─────────────────────────────────────────────────────
// Picked by (daysElapsed % length) — stable within a day, fresh each session.
const FLAVOR_LINES = [
  "Step up to the plate.",
  "The only inning that matters is this one.",
  "No excuses. Just outs.",
  "Win today. Worry about tomorrow later.",
  "The grind is the game.",
  "Three outs. That's the goal.",
  "Consistency beats talent. Every time.",
  "Small wins add up to seasons.",
  "Show up. Lock in. Win.",
  "Champions practice when no one's watching.",
  "One inning at a time.",
  "Build the habit. Win the inning.",
  "Stay in the box. Keep swinging.",
  "Defense wins games. Offense wins fans.",
  "Make today's inning count.",
  "Momentum is built one rep at a time.",
  "You rise to your habits, not your goals.",
  "Back in the box. Time to swing.",
  "Every inning shapes the season.",
  "Today's effort is tomorrow's results.",
  "The scoreboard doesn't lie.",
  "Earn it. Every. Single. Day.",
]

export default function DayContext({ season, todayStr, sport, inningsPlayed, inningsWon }: Props) {
  const sportEmoji = sport === 'baseball' ? '⚾' : '🥎'

  // Game number — index of the game containing today
  const sortedGames = [...season.games].sort((a, b) => a.week_start.localeCompare(b.week_start))
  const gameIdx     = sortedGames.findIndex(g => g.week_start <= todayStr && g.week_end >= todayStr)
  const gameNum     = gameIdx >= 0 ? gameIdx + 1 : sortedGames.length + 1
  const inningNum   = inningNumber(todayStr)

  // Season progress
  const startMs     = new Date(season.start_date + 'T12:00:00').getTime()
  const todayMs     = new Date(todayStr + 'T12:00:00').getTime()
  const daysElapsed = Math.max(1, Math.round((todayMs - startMs) / 86_400_000) + 1)
  const totalDays   = season.length_weeks ? season.length_weeks * 7 : null
  const pct         = totalDays ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : null
  const daysLeft    = totalDays ? Math.max(0, totalDays - daysElapsed) : null

  const winRate = inningsPlayed > 0 ? Math.round((inningsWon / inningsPlayed) * 100) : null

  // Flavor line — rotates daily
  const flavorLine = FLAVOR_LINES[daysElapsed % FLAVOR_LINES.length]

  // Progress label
  const progressLabel = pct === null ? null :
    pct < 15  ? 'Early season' :
    pct < 40  ? 'Building momentum' :
    pct < 60  ? 'Halfway there' :
    pct < 80  ? 'Final stretch' :
    pct < 95  ? 'Closing strong' :
                'Last innings'

  return (
    <div className="rounded-2xl overflow-hidden mb-4 shadow-sm">

      {/* ── Navy header ─────────────────────────────────────────────── */}
      <div className="bg-brand-navy px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">
              {sportEmoji} Game {gameNum} · Inning {inningNum}
            </p>
            <p className="text-white font-black text-xl leading-tight">
              {flavorLine}
            </p>
            {winRate !== null && inningsPlayed >= 3 && (
              <p className="text-white/40 text-xs mt-1.5 font-semibold">
                {inningsWon}W–{inningsPlayed - inningsWon}L &nbsp;·&nbsp; {winRate}% win rate
                {daysLeft !== null ? ` · ${daysLeft}d left` : ''}
              </p>
            )}
          </div>

          {pct !== null && (
            <div className="text-right flex-shrink-0 pt-0.5">
              <p className="text-3xl font-black text-brand-orange leading-none tabular-nums">{pct}%</p>
              <p className="text-white/30 text-[10px] mt-0.5 font-semibold">
                {progressLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      {pct !== null && (
        <div className="h-1.5 bg-brand-navy/80">
          <div
            className="h-full bg-gradient-to-r from-brand-orange to-amber-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* ── Win condition ─────────────────────────────────────────────── */}
      {season.success_definition && (
        <div className="bg-brand-navy/5 border-t border-slate-100 px-5 py-2.5">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-brand-navy">🎯 Win condition: </span>
            {season.success_definition}
          </p>
        </div>
      )}
    </div>
  )
}
