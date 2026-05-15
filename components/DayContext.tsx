'use client'

import { inningNumber } from '@/lib/game-logic'
import type { FullSeason } from '@/types'

interface Props {
  season:       FullSeason
  todayStr:     string
  sport:        'softball' | 'baseball'
  inningsPlayed: number
  inningsWon:   number
}

export default function DayContext({ season, todayStr, sport, inningsPlayed, inningsWon }: Props) {
  const sportEmoji = sport === 'baseball' ? '⚾' : '🥎'

  // Game number — index of the game containing today
  const sortedGames = [...season.games].sort((a, b) => a.week_start.localeCompare(b.week_start))
  const gameIdx     = sortedGames.findIndex(g => g.week_start <= todayStr && g.week_end >= todayStr)
  const gameNum     = gameIdx >= 0 ? gameIdx + 1 : sortedGames.length + 1
  const inningNum   = inningNumber(todayStr)

  // Season progress
  const startMs    = new Date(season.start_date + 'T12:00:00').getTime()
  const todayMs    = new Date(todayStr + 'T12:00:00').getTime()
  const daysElapsed = Math.max(1, Math.round((todayMs - startMs) / 86_400_000) + 1)
  const totalDays  = season.length_weeks ? season.length_weeks * 7 : null
  const pct        = totalDays ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : null
  const daysLeft   = totalDays ? Math.max(0, totalDays - daysElapsed) : null

  const progressMsg = pct === null ? `Day ${daysElapsed}` :
    pct < 25  ? 'Early season — build your habits' :
    pct < 50  ? 'Building momentum' :
    pct < 75  ? 'Past the halfway point — stay consistent' :
    pct < 90  ? 'Final stretch — make every inning count' :
                'Closing out the season strong'

  const winRate = inningsPlayed > 0 ? Math.round((inningsWon / inningsPlayed) * 100) : null

  return (
    <div className="bg-white rounded-2xl overflow-hidden mb-4 border border-slate-100 shadow-sm">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Season in Progress
          </p>
          <p className="text-brand-navy font-black text-xl leading-tight">
            {sportEmoji} Game {gameNum} · Inning {inningNum}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {progressMsg}{daysLeft !== null ? ` · ${daysLeft}d left` : ''}
            {winRate !== null ? ` · ${winRate}% win rate` : ''}
          </p>
        </div>

        {pct !== null && (
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-black text-brand-orange leading-none">{pct}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">complete</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-brand-orange to-amber-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Win condition / success definition */}
      {season.success_definition && (
        <div className="px-5 py-2.5 border-t border-slate-50">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-brand-navy">🎯 Win condition: </span>
            {season.success_definition}
          </p>
        </div>
      )}
    </div>
  )
}
