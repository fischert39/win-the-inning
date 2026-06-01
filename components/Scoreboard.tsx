'use client'

import { useState, useEffect } from 'react'
import type { FullGame, FullInning } from '@/types'
import { getWeekDates, getWeekStart, toDateKey, dayShort, inningResult, gameResult, simulateRuns, effectiveOuts, isPreSeasonGame } from '@/lib/game-logic'

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

  const activeGame  = games.find(g => g.week_start === displayWeekStart) ?? null
  const dates       = getWeekDates(displayWeekStart)
  const inningMap: Record<string, FullInning> = {}
  for (const inn of (activeGame?.innings ?? [])) inningMap[inn.date] = inn

  const isPreSeason = isPreSeasonGame(seasonStartDate, displayWeekStart)
  const totalRuns   = activeGame?.innings.reduce((s, i) => s + simulateRuns(i.offense_goals), 0) ?? 0
  const gResult     = (!isPreSeason && activeGame) ? gameResult(activeGame.innings) : null
  const inningWins  = (activeGame?.innings ?? []).filter(i => inningResult(i) === 'WIN').length
  const winsNeeded  = 4

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
          <span className={`text-xs font-bold ${isPreSeason ? 'text-amber-400' : 'text-white/50'}`}>
            {isPreSeason
              ? '⚾ Pre-Season'
              : `Week of ${(() => { const d = new Date(displayWeekStart + 'T12:00:00'); return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}` })()}`
            }
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

      {/* Pre-season note */}
      {isPreSeason && (
        <div className="mb-3 px-1">
          <p className="text-amber-400/70 text-[10px] font-semibold text-center">
            Warm-up week · doesn&apos;t count toward your record
          </p>
        </div>
      )}

      {/* Win progress — only while game is in progress and not pre-season */}
      {!isPreSeason && gResult === 'IN_PROGRESS' && activeGame && (
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
          const outs      = inn ? effectiveOuts(inn) : 0
          const isRainDelay = inn?.is_rain_delay ?? false

          // Cell background — muted during pre-season (results don't count)
          let cellBg = 'bg-white/5 hover:bg-white/10'
          if (isRainDelay)               cellBg = 'bg-sky-500/20    hover:bg-sky-500/30'
          else if (!isPreSeason && res === 'WIN')  cellBg = 'bg-brand-green/25 hover:bg-brand-green/35'
          else if (!isPreSeason && res === 'TIE')  cellBg = 'bg-yellow-500/25  hover:bg-yellow-500/35'
          else if (!isPreSeason && res === 'LOSS') cellBg = 'bg-brand-red/25   hover:bg-brand-red/35'
          else if (isPreSeason && res && res !== 'IN_PROGRESS') cellBg = 'bg-amber-500/10 hover:bg-amber-500/15'

          let ringClass = ''
          if (isViewing)                    ringClass = 'ring-2 ring-brand-orange'
          else if (isToday && !isViewing)   ringClass = 'ring-2 ring-white/40'

          // Result glyph
          const ResultGlyph = () => {
            if (!inn)         return <span className="text-white/15 text-lg leading-none">–</span>
            if (isRainDelay)  return <span className="text-lg leading-none">☔</span>
            if (res === 'WIN')  return (
              <div className="flex flex-col items-center">
                <span className="text-brand-green font-black text-base leading-none">W</span>
                <span className="text-brand-green/70 text-[10px] font-bold tabular-nums leading-none mt-0.5">{runs}R</span>
              </div>
            )
            if (res === 'TIE')  return (
              <div className="flex flex-col items-center">
                <span className="text-yellow-400 font-black text-base leading-none">T</span>
                <span className="text-yellow-400/70 text-[10px] font-bold leading-none mt-0.5">–</span>
              </div>
            )
            if (res === 'LOSS') return (
              <div className="flex flex-col items-center">
                <span className="text-brand-red font-black text-base leading-none">L</span>
                <span className="text-brand-red/70 text-[10px] font-bold tabular-nums leading-none mt-0.5">{outs}/3</span>
              </div>
            )
            // In-progress: show out dots
            return (
              <div className="flex flex-col items-center gap-1">
                <div className="flex gap-0.5">
                  {[0,1,2].map(i => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${i < outs ? 'bg-brand-orange' : 'bg-white/20'}`} />
                  ))}
                </div>
                {runs > 0 && (
                  <span className="text-brand-orange/70 text-[10px] font-bold tabular-nums leading-none">{runs}R</span>
                )}
              </div>
            )
          }

          return (
            <button
              key={date}
              onClick={() => onViewDate(date)}
              className={`${cellBg} ${ringClass} rounded-xl px-2 py-3.5 flex flex-col items-center gap-2 transition-all min-w-[44px] max-w-[52px] flex-1 cursor-pointer`}
            >
              {/* Day name */}
              <span className={`text-[11px] font-black uppercase tracking-wide leading-none ${
                isToday ? 'text-brand-orange' : 'text-white/40'
              }`}>
                {dayShort(date)}
              </span>

              {/* Inning number */}
              <span className="text-white/20 text-[9px] font-semibold leading-none">{idx + 1}</span>

              {/* Result glyph */}
              <div className="flex items-center justify-center min-h-[32px]">
                <ResultGlyph />
              </div>
            </button>
          )
        })}

        {/* Totals column */}
        <div className="bg-white/8 rounded-xl px-2.5 py-3.5 flex flex-col items-center justify-center gap-1.5 min-w-[44px] border border-white/10">
          <span className="text-white/30 text-[9px] font-black uppercase tracking-wide">Runs</span>
          <span className="text-white text-xl font-black tabular-nums leading-none">{totalRuns}</span>
          <span className="text-white/20 text-[9px] font-semibold">Total</span>
        </div>
      </div>
    </div>
  )
}
