'use client'

import { useState, useEffect } from 'react'
import type { FullGame } from '@/types'
import { inningResult, gameResult, simulateRuns, displayDate } from '@/lib/game-logic'

interface Props {
  game:          FullGame
  weekStart:     string  // current week start — used as the dismissal key
  sport:         'softball' | 'baseball'
}

const STORAGE_KEY = 'wti_wrapup_dismissed'

export default function WeeklyWrapUp({ game, weekStart, sport }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed !== weekStart) setVisible(true)
  }, [weekStart])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, weekStart)
    setVisible(false)
  }

  if (!visible) return null

  const closed     = game.innings.filter(i => i.status === 'CLOSED')
  const wins       = closed.filter(i => inningResult(i) === 'WIN').length
  const losses     = closed.filter(i => inningResult(i) === 'LOSS').length
  const ties       = closed.filter(i => inningResult(i) === 'TIE').length
  const totalRuns  = game.innings.reduce((sum, i) => sum + simulateRuns(i.offense_goals), 0)
  const result     = gameResult(game.innings)
  const sportEmoji = sport === 'baseball' ? '⚾' : '🥎'

  const bestDay = closed.reduce<{ date: string; runs: number } | null>((best, i) => {
    const runs = simulateRuns(i.offense_goals)
    return !best || runs > best.runs ? { date: i.date, runs } : best
  }, null)

  return (
    <div className="bg-brand-navy rounded-2xl overflow-hidden shadow-lg animate-slide-up mb-4">
      {/* Header bar */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-0.5">
            Last Week&apos;s Recap
          </p>
          <h2 className="text-white font-black text-lg leading-tight">
            {result === 'WIN'  ? '🏆 You Won the Week!' :
             result === 'LOSS' ? '💪 Keep Grinding'     :
                                 `${sportEmoji} Week Complete`}
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            {displayDate(game.week_start)} — {displayDate(game.week_end)}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none mt-0.5"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Stats row */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-white font-black text-xl">
            {wins}–{losses}{ties > 0 ? `–${ties}` : ''}
          </div>
          <div className="text-white/40 text-[10px] mt-0.5">W–L{ties > 0 ? '–T' : ''}</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-white font-black text-xl">{totalRuns}</div>
          <div className="text-white/40 text-[10px] mt-0.5">Runs Scored</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="text-white font-black text-xl">{closed.length}/7</div>
          <div className="text-white/40 text-[10px] mt-0.5">Innings Played</div>
        </div>
      </div>

      {/* Best day callout */}
      {bestDay && bestDay.runs > 0 && (
        <div className="mx-5 mb-4 bg-brand-orange/10 border border-brand-orange/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-lg">🌟</span>
          <p className="text-white/80 text-sm">
            Best day: <span className="text-white font-bold">{displayDate(bestDay.date)}</span>
            {' '}with <span className="text-brand-orange font-bold">{bestDay.runs} run{bestDay.runs !== 1 ? 's' : ''}</span>
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={dismiss}
          className="w-full bg-brand-orange text-white font-black text-sm py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Let&apos;s Go This Week {sportEmoji}
        </button>
      </div>
    </div>
  )
}
