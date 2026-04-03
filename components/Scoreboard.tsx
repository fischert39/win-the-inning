'use client'

import type { FullGame, FullInning } from '@/types'
import { getWeekDates, dayShort, inningResult, gameResult, simulateRuns, countOuts } from '@/lib/game-logic'

interface Props {
  games:       FullGame[]
  todayStr:    string
  viewDate:    string
  onViewDate:  (date: string) => void
}

export default function Scoreboard({ games, todayStr, viewDate, onViewDate }: Props) {
  // Find the game containing todayStr (or viewDate)
  const activeDate  = viewDate || todayStr
  const activeGame  = games.find(g => g.week_start <= activeDate && g.week_end >= activeDate)
    ?? games.find(g => g.week_start <= todayStr && g.week_end >= todayStr)
    ?? games[games.length - 1]

  if (!activeGame) return null

  const dates  = getWeekDates(activeGame.week_start)
  const inningMap: Record<string, FullInning> = {}
  for (const inn of activeGame.innings) inningMap[inn.date] = inn

  const totalRuns  = activeGame.innings.reduce((s, i) => s + simulateRuns(i.offense_goals), 0)
  const gResult    = gameResult(activeGame.innings)
  const inningWins = activeGame.innings.filter(i => inningResult(i) === 'WIN').length
  const winsNeeded = 5

  return (
    <div className="bg-brand-navy rounded-2xl p-4 mb-4 shadow-xl overflow-x-auto scrollbar-hide">
      {/* Week label */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-white/40 text-xs font-bold uppercase tracking-widest">
          Week of {new Date(activeGame.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        {gResult !== 'IN_PROGRESS' && (
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
            gResult === 'WIN' ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-red/20 text-brand-red'
          }`}>
            {gResult === 'WIN' ? '🏆 GAME WIN' : '❌ GAME L'}
          </span>
        )}
      </div>

      {/* Win progress — only while game is in progress */}
      {gResult === 'IN_PROGRESS' && (
        <div className="mb-3 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/50 text-[10px] font-semibold">
              Win {winsNeeded - inningWins > 0
                ? `${winsNeeded - inningWins} more inning${winsNeeded - inningWins !== 1 ? 's' : ''} to win the game`
                : 'Game secured!'}
            </span>
            <span className="text-white/50 text-[10px] font-bold tabular-nums">{inningWins}/{winsNeeded}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: winsNeeded }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  i < inningWins ? 'bg-brand-green' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex gap-1.5 min-w-max">
        {dates.map((date, idx) => {
          const inn      = inningMap[date]
          const isToday  = date === todayStr
          const isViewing = date === viewDate
          const isFuture = date > todayStr
          const res      = inn ? inningResult(inn) : null
          const runs     = inn ? simulateRuns(inn.offense_goals) : 0
          const outs     = inn ? countOuts(inn) : 0

          let cellBg = 'bg-white/5 hover:bg-white/10'
          if (res === 'WIN')  cellBg = 'bg-brand-green/20 hover:bg-brand-green/30'
          if (res === 'LOSS') cellBg = 'bg-brand-red/20   hover:bg-brand-red/30'
          if (isViewing)      cellBg += ' ring-2 ring-brand-orange'
          if (isToday && !isViewing) cellBg += ' ring-2 ring-white/30'

          return (
            <button
              key={date}
              onClick={() => onViewDate(date)}
              className={`${cellBg} rounded-xl px-3 py-2.5 flex flex-col items-center gap-1 transition-all min-w-[52px] cursor-pointer`}
            >
              <span className="text-white/40 text-[10px] font-bold">{idx + 1}</span>
              <span className={`text-[11px] font-semibold ${isToday ? 'text-brand-orange' : 'text-white/60'}`}>
                {dayShort(date)}
              </span>
              {!inn ? (
                <span className="text-white/20 text-xs">–</span>
              ) : res === 'WIN' ? (
                <span className="text-brand-green text-xs font-black">W</span>
              ) : res === 'LOSS' ? (
                <span className="text-brand-red text-xs font-black">L</span>
              ) : (
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < outs ? 'bg-brand-orange' : 'bg-white/20'}`} />
                  ))}
                </div>
              )}
              <span className="text-white/50 text-[10px] tabular-nums">
                {inn ? `${runs}R` : isFuture ? '' : '–'}
              </span>
            </button>
          )
        })}

        {/* Totals column */}
        <div className="bg-white/8 rounded-xl px-3 py-2.5 flex flex-col items-center gap-1 min-w-[52px] border border-white/10">
          <span className="text-white/40 text-[10px] font-bold">R</span>
          <span className="text-white text-sm font-black tabular-nums">{totalRuns}</span>
          <span className="text-white/30 text-[10px]">Total</span>
        </div>
      </div>
    </div>
  )
}
