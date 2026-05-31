'use client'

import { useMemo } from 'react'
import type { FullSeason } from '@/types'
import { gameResult, simulateRuns, displayDate, currentStreak } from '@/lib/game-logic'

interface Props {
  season:     FullSeason
  sport:      'softball' | 'baseball'
  onStartNew: () => void
}

const WIN_COLORS  = ['#FF6B35','#F5A623','#FFD700','#FFFFFF','#2DC653','#00B4D8']
const LOSS_COLORS = ['#FF6B35','#9B5DE5','#FFFFFF','#94a3b8']
const COUNT = 50

export default function SeasonRecap({ season, sport, onStartNew }: Props) {
  const allInnings    = season.games.flatMap(g => g.innings)
  const closedInnings = allInnings.filter(i => i.status === 'CLOSED')
  const inningWins    = closedInnings.filter(i => i.result === 'WIN').length

  const gamesWithPlay = season.games.filter(g => g.innings.some(i => i.status === 'CLOSED'))
  const gameWins      = gamesWithPlay.filter(g => gameResult(g.innings) === 'WIN').length
  const gameLosses    = gamesWithPlay.filter(g => gameResult(g.innings) === 'LOSS').length
  const seasonWon     = gameWins > gameLosses

  const totalRuns  = allInnings.reduce((sum, i) => sum + simulateRuns(i.offense_goals), 0)
  const mindOuts   = closedInnings.filter(i => i.mind_completed).length
  const spiritOuts = closedInnings.filter(i => i.spirit_completed).length
  const bodyOuts   = closedInnings.filter(i => i.body_completed).length

  const sortedInnings = [...closedInnings].sort((a, b) => a.date.localeCompare(b.date))
  let bestStreak = 0, curStreak = 0
  for (const i of sortedInnings) {
    if (i.result === 'WIN') { curStreak++; bestStreak = Math.max(bestStreak, curStreak) }
    else curStreak = 0
  }

  const goalsCompleted = season.season_goals.filter(g => g.completed).length
  const goalsTotal     = season.season_goals.length
  const sportEmoji     = sport === 'baseball' ? '⚾' : '🥎'

  const colors = seasonWon ? WIN_COLORS : LOSS_COLORS
  const pieces = useMemo(() => {
    const phi = 1.6180339887
    return Array.from({ length: COUNT }, (_, i) => ({
      id: i, color: colors[i % colors.length],
      left: (i * phi * 100) % 100,
      delay: (i * 0.05) % 1.8,
      duration: 2.5 + (i % 6) * 0.3,
      size: 5 + (i % 4) * 2,
      rotate: (i * 53) % 360,
      isCircle: i % 5 === 0,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonWon])

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-[#0D0D1E] to-[#0F1F10] overflow-y-auto relative">
      <style>{`
        @keyframes sr-fall {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          80%  { opacity: 0.8; }
          100% { opacity: 0; transform: translateY(110vh) rotate(540deg); }
        }
        @keyframes sr-trophy {
          0%   { transform: scale(0.3) rotate(-20deg); opacity: 0; }
          65%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes sr-idle {
          0%, 100% { transform: translateY(0) scale(1); }
          50%      { transform: translateY(-12px) scale(1.05); }
        }
        @keyframes sr-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(255,107,53,0.6); }
          50%      { text-shadow: 0 0 40px rgba(255,107,53,1), 0 0 80px rgba(255,107,53,0.4); }
        }
        @keyframes sr-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {pieces.map(p => (
          <div key={p.id} style={{
            position: 'absolute', top: '-20px', left: `${p.left}%`,
            width: `${p.size}px`,
            height: p.isCircle ? `${p.size}px` : `${Math.round(p.size * 0.4)}px`,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : '2px',
            animation: `sr-fall ${p.duration}s ${p.delay}s ease-in forwards`,
            transform: `rotate(${p.rotate}deg)`,
          }} />
        ))}
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-6 py-10">

        {/* Trophy / header */}
        <div className="text-center mb-8">
          <div
            className="text-8xl block mb-4 leading-none"
            style={{ animation: 'sr-trophy 0.7s cubic-bezier(0.34,1.4,0.64,1) both, sr-idle 2s 1s ease-in-out infinite' }}
          >
            {seasonWon ? '🏆' : sportEmoji}
          </div>
          <h1
            className="text-4xl font-black text-white mb-2 leading-tight"
            style={{ animation: seasonWon ? 'sr-glow 2.5s 0.8s ease-in-out infinite' : 'none' }}
          >
            {seasonWon ? 'Winning Season!' : 'Season Complete'}
          </h1>
          <p className="text-white/50 text-sm">
            {displayDate(season.start_date)}
            {season.end_date ? ` — ${displayDate(season.end_date)}` : ''}
          </p>
        </div>

        {/* Season result banner */}
        <div
          className={`rounded-2xl p-5 mb-6 text-center border ${
            seasonWon
              ? 'bg-brand-green/20 border-brand-green/30'
              : 'bg-white/8 border-white/10'
          }`}
          style={{ animation: 'sr-in 0.4s 0.3s both' }}
        >
          <p className={`text-3xl font-black mb-1 ${seasonWon ? 'text-brand-green' : 'text-white/80'}`}>
            {gameWins}–{gameLosses}
          </p>
          <p className="text-white/50 text-sm">
            {seasonWon ? '🎉 Winning record — well earned.' : '💪 Keep grinding. Next season is yours.'}
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6" style={{ animation: 'sr-in 0.4s 0.45s both' }}>
          {[
            { label: 'Innings Won',  value: `${inningWins}/${closedInnings.length}`, icon: '🥎' },
            { label: 'Runs Scored',  value: String(totalRuns),                       icon: '🏃' },
            { label: 'Best Streak',  value: `${bestStreak} in a row`,                icon: '🔥' },
            { label: 'Season Goals', value: `${goalsCompleted}/${goalsTotal}`,        icon: '🎯' },
          ].map(s => (
            <div key={s.label} className="bg-white/8 border border-white/10 rounded-xl p-4 text-center">
              <span className="text-2xl block mb-1">{s.icon}</span>
              <div className="text-white font-black text-xl">{s.value}</div>
              <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Defense breakdown */}
        <div className="bg-white/8 border border-white/10 rounded-xl p-5 mb-6" style={{ animation: 'sr-in 0.4s 0.6s both' }}>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-4">Defense Breakdown</p>
          <div className="space-y-3">
            {[
              { icon: '🧠', label: 'Mind',   count: mindOuts   },
              { icon: '✨', label: 'Spirit', count: spiritOuts },
              { icon: '💪', label: 'Body',   count: bodyOuts   },
            ].map(d => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="text-lg w-6">{d.icon}</span>
                <span className="text-white/70 text-sm w-12">{d.label}</span>
                <div className="flex-1 bg-white/10 rounded-full h-2">
                  <div
                    className="bg-brand-orange h-2 rounded-full transition-all duration-700"
                    style={{ width: closedInnings.length > 0 ? `${(d.count / closedInnings.length) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-white/50 text-xs w-12 text-right">{d.count}/{closedInnings.length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Season goals list */}
        {goalsTotal > 0 && (
          <div className="bg-white/8 border border-white/10 rounded-xl p-5 mb-8" style={{ animation: 'sr-in 0.4s 0.75s both' }}>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-3">Season Goals</p>
            <div className="space-y-2">
              {season.season_goals.map(g => (
                <div key={g.id} className="flex items-center gap-3">
                  <span className="text-base flex-shrink-0">{g.completed ? '✅' : '⬜'}</span>
                  <span className={`text-sm ${g.completed ? 'text-white' : 'text-white/40'}`}>
                    {g.text || 'Untitled goal'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onStartNew}
          className="w-full bg-gradient-to-r from-brand-orange to-[#FF4500] text-white font-black text-lg py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all"
          style={{
            animation:  'sr-in 0.4s 0.9s both',
            boxShadow: '0 8px 32px rgba(255,107,53,0.4)',
          }}
        >
          ⚡ Start New Season
        </button>
      </div>
    </div>
  )
}
