'use client'

import { useState, useEffect } from 'react'
import type { FullGame, FullInning } from '@/types'
import { getWeekDates, getWeekStart, toDateKey, dayShort, inningResult, gameResult, simulateRuns, countOuts } from '@/lib/game-logic'

interface Props {
  games:            FullGame[]
  todayStr:         string
  viewDate:         string
  seasonStartDate:  string
  onViewDate:       (date: string) => void
}

export default function Scoreboard({ games, todayStr, viewDate, seasonStartDate, onViewDate }: Props) {
  const [displayWeekStart, setDisplayWeekStart] = useState(() => getWeekStart(viewDate || todayStr))

  useEffect(() => {
    setDisplayWeekStart(getWeekStart(viewDate || todayStr))
  }, [viewDate, todayStr])

  const todayWeekStart   = getWeekStart(todayStr)
  const seasonWeekStart  = getWeekStart(seasonStartDate)
  const canGoPrev        = displayWeekStart > seasonWeekStart
  const canGoNext        = displayWeekStart < todayWeekStart

  function shiftWeek(delta: number) {
    const d = new Date(displayWeekStart + 'T12:00:00')
    d.setDate(d.getDate() + delta * 7)
    setDisplayWeekStart(toDateKey(d))
  }

  const activeGame = games.find(g => g.week_start === displayWeekStart) ?? null
  const dates      = getWeekDates(displayWeekStart)
  const inningMap: Record<string, FullInning> = {}
  for (const inn of (activeGame?.innings ?? [])) inningMap[inn.date] = inn

  const totalRuns = activeGame?.innings.reduce((s, i) => s + simulateRuns(i.offense_goals), 0) ?? 0
  const gResult   = activeGame ? gameResult(activeGame.innings) : null
  const inningWins = (activeGame?.innings ?? []).filter(i => inningResult(i) === 'WIN').length
  const winsNeeded = 4 // mathematical lock-in: win > loss + remaining means you need 4 wins typically

  return (
    <div className="bg-brand-navy rounded-2xl p-4 mb-4 shadow-xl overflow-x-auto scrollbar-hide">
      {/* Week label + navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeek(-1)}
            disabled={!canGoPrev}
            className="text-white/40 hover:text-white disabled:opacity-20 transition-colors font-bold text-sm px-1"
          >
            ‹
          </button>
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">
            Week of {new Date(displayWeekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => shiftWeek(1)}
            disabled={!canGoNext}
            className="text-white/40 hover:text-white disabled:opacity-20 transition-colors font-bold text-sm px-1"
          >
            ›
          </button>
        </div>
        {gResult && gResult !== 'IN_PROGRESS' && (
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
            gResult === 'WIN'  ? 'bg-brand-green/20 text-brand-green' :
            gResult === 'TIE'  ? 'bg-yellow-500/20 text-yellow-400'   :
                                 'bg-brand-red/20 text-brand-red'
          }`}>
            {gResult === 'WIN' ? '🏆 GAME WIN' : gResult === 'TIE' ? '🤝 GAME TIE' : '❌ GAME L'}
          </span>
        )}
      </div>

      {/* Win progress — only while game is in progress */}
      {gResult === 'IN_PROGRESS' && activeGame && (
        <div className="mb-3 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/50 text-[10px] font-semibold">
              {inningWins >= winsNeeded
                ? 'Game secured!'
                : `${winsNeeded - inningWins} more win${winsNeeded - inningWins !== 1 ? 's' : ''} to lock up the game`}
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
          const inn       = inningMap[date]
          const isToday   = date === todayStr
          const isViewing = date === viewDate
          const isFuture  = date > todayStr
          const res       = inn ? inningResult(inn) : null
          const runs      = inn ? simulateRuns(inn.offense_goals) : 0
          const outs      = inn ? countOuts(inn) : 0

          let cellBg = 'bg-white/5 hover:bg-white/10'
          if (res === 'WIN')  cellBg = 'bg-brand-green/20 hover:bg-brand-green/30'
          if (res === 'TIE')  cellBg = 'bg-yellow-500/20  hover:bg-yellow-500/30'
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
              ) : res === 'TIE' ? (
                <span className="text-yellow-400 text-xs font-black">T</span>
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
