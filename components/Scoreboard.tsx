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
  const nextWeekStart    = toDateKey(new Date(new Date(todayWeekStart + 'T12:00:00').setDate(new Date(todayWeekStart + 'T12:00:00').getDate() + 7)))
  const canGoPrev        = displayWeekStart > seasonWeekStart
  const canGoNext        = displayWeekStart < nextWeekStart

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
    <div className="bg-brand-navy rounded-2xl p-4 mb-4 shadow-sm overflow-x-auto scrollbar-hide">
      {/* Week label + navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => shiftWeek(-1)}
            disabled={!canGoPrev}
            className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-white/50 text-xs font-medium">
            Week of {(() => { const d = new Date(displayWeekStart + 'T12:00:00'); return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}` })()}
          </span>
          <button
            onClick={() => shiftWeek(1)}
            disabled={!canGoNext}
            className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {gResult && gResult !== 'IN_PROGRESS' && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            gResult === 'WIN'  ? 'bg-brand-green/20 text-brand-green' :
            gResult === 'TIE'  ? 'bg-yellow-500/20 text-yellow-400'   :
                                 'bg-brand-red/20 text-brand-red'
          }`}>
            {gResult === 'WIN' ? 'Game Win' : gResult === 'TIE' ? 'Game Tie' : 'Game Loss'}
          </span>
        )}
      </div>

      {/* Win progress — only while game is in progress */}
      {gResult === 'IN_PROGRESS' && activeGame && (
        <div className="mb-3 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-white/50 text-[10px] font-medium">
              {inningWins >= winsNeeded
                ? 'Game secured!'
                : `${winsNeeded - inningWins} more win${winsNeeded - inningWins !== 1 ? 's' : ''} to lock up the game`}
            </span>
            <span className="text-white/50 text-[10px] tabular-nums">{inningWins}/{winsNeeded}</span>
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

          const isRainDelay = inn?.is_rain_delay ?? false
          let cellBg = 'bg-white/5 hover:bg-white/10'
          if (isRainDelay)    cellBg = 'bg-sky-500/15    hover:bg-sky-500/25'
          else if (res === 'WIN')  cellBg = 'bg-brand-green/20 hover:bg-brand-green/30'
          else if (res === 'TIE')  cellBg = 'bg-yellow-500/20  hover:bg-yellow-500/30'
          else if (res === 'LOSS') cellBg = 'bg-brand-red/20   hover:bg-brand-red/30'
          if (isViewing)      cellBg += ' ring-2 ring-brand-orange'
          if (isToday && !isViewing) cellBg += ' ring-2 ring-white/30'

          return (
            <button
              key={date}
              onClick={() => onViewDate(date)}
              className={`${cellBg} rounded-xl px-2.5 py-3 flex flex-col items-center gap-1.5 transition-all min-w-[48px] cursor-pointer`}
            >
              <span className={`text-[10px] font-semibold ${isToday ? 'text-brand-orange' : 'text-white/40'}`}>
                {dayShort(date)}
              </span>
              <span className="text-white/30 text-[9px]">{idx + 1}</span>
              {!inn ? (
                <span className="text-white/20 text-sm font-light">·</span>
              ) : isRainDelay ? (
                <span className="text-sky-400 text-sm">☔</span>
              ) : res === 'WIN' ? (
                <span className="text-brand-green text-sm font-bold">W</span>
              ) : res === 'TIE' ? (
                <span className="text-yellow-400 text-sm font-bold">T</span>
              ) : res === 'LOSS' ? (
                <span className="text-brand-red text-sm font-bold">L</span>
              ) : (
                <div className="flex gap-0.5 py-0.5">
                  {[0, 1, 2].map(i => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < outs ? 'bg-brand-orange' : 'bg-white/20'}`} />
                  ))}
                </div>
              )}
              <span className="text-white/40 text-[9px] tabular-nums font-medium">
                {inn ? `${runs}R` : isFuture ? '' : ''}
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
