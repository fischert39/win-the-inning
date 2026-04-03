'use client'

import type { FullSeason } from '@/types'
import { gameResult, inningResult, simulateRuns, displayDate } from '@/lib/game-logic'

interface Props {
  season: FullSeason
  sport: 'softball' | 'baseball'
  onStartNew: () => void
}

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0F3460] overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-7xl block mb-4">{seasonWon ? '🏆' : sportEmoji}</span>
          <h1 className="text-3xl font-black text-white mb-2">Season Complete!</h1>
          <p className="text-white/50 text-sm">
            {displayDate(season.start_date)}
            {season.end_date ? ` — ${displayDate(season.end_date)}` : ''}
          </p>
        </div>

        {/* Season result banner */}
        <div className={`rounded-2xl p-5 mb-6 text-center border ${
          seasonWon
            ? 'bg-green-500/20 border-green-400/30'
            : 'bg-red-500/20 border-red-400/30'
        }`}>
          <p className={`text-2xl font-black ${seasonWon ? 'text-green-400' : 'text-red-400'}`}>
            {seasonWon ? '🎉 Winning Season!' : '💪 Keep Grinding'}
          </p>
          <p className="text-white/60 text-sm mt-1">
            Game Record: <span className="text-white font-bold">{gameWins}W — {gameLosses}L</span>
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Innings Won',   value: `${inningWins}/${closedInnings.length}`, icon: '🥎' },
            { label: 'Runs Scored',   value: String(totalRuns),                       icon: '🏃' },
            { label: 'Best Streak',   value: `${bestStreak} in a row`,                icon: '🔥' },
            { label: 'Season Goals',  value: `${goalsCompleted}/${goalsTotal}`,        icon: '🎯' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <span className="text-2xl block mb-1">{s.icon}</span>
              <div className="text-white font-black text-xl">{s.value}</div>
              <div className="text-white/50 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Defense breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Defense Breakdown</p>
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
                    className="bg-brand-orange h-2 rounded-full"
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
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Season Goals</p>
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
          className="w-full bg-gradient-to-r from-brand-orange to-[#FF4500] text-white font-black text-lg py-4 rounded-2xl shadow-xl hover:opacity-90 active:scale-[0.98] transition-all duration-150"
        >
          ⚡ Start New Season
        </button>
      </div>
    </div>
  )
}
