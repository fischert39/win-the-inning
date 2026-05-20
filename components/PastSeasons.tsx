'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { FullSeason } from '@/types'
import { gameResult, displayDate, currentStreak } from '@/lib/game-logic'

interface Props {
  userId: string
  sport:  'softball' | 'baseball'
  onBack: () => void
}

export default function PastSeasons({ userId, sport, onBack }: Props) {
  const [seasons, setSeasons] = useState<FullSeason[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const sportEmoji = sport === 'baseball' ? '⚾' : '🥎'

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('seasons')
        .select('*, season_goals(*), games(*, innings(id, date, status, result, is_rain_delay, pinch_hit_used, mind_completed, spirit_completed, body_completed, offense_goals(*)))')
        .eq('user_id', userId)
        .eq('is_current', false)
        .order('created_at', { ascending: false })

      setSeasons(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function getStats(season: FullSeason) {
    const allInnings    = season.games.flatMap(g => g.innings)
    const closedInnings = allInnings.filter(i => i.status === 'CLOSED')
    const inningWins    = closedInnings.filter(i => i.result === 'WIN').length
    const gamesWithPlay = season.games.filter(g => g.innings.some(i => i.status === 'CLOSED'))
    const gameWins      = gamesWithPlay.filter(g => gameResult(g.innings) === 'WIN').length
    const gameLosses    = gamesWithPlay.filter(g => gameResult(g.innings) === 'LOSS').length
    const seasonWon     = gameWins > gameLosses
    const streak        = currentStreak(season.games)
    const goalsCompleted = season.season_goals.filter(g => g.completed).length
    const goalsTotal     = season.season_goals.length
    return { inningWins, closedInnings: closedInnings.length, gameWins, gameLosses, seasonWon, streak, goalsCompleted, goalsTotal }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0F3460] overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="text-white/50 hover:text-white transition-colors text-sm font-semibold"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Past Seasons</h1>
            <p className="text-white/40 text-xs mt-0.5">{sportEmoji} Your full history</p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3 animate-bounce-slow">{sportEmoji}</span>
            <p className="text-white/50">Loading seasons…</p>
          </div>
        )}

        {!loading && seasons.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl block mb-3">🏟️</span>
            <p className="text-white/60 font-semibold">No seasons in the books yet.</p>
            <p className="text-white/30 text-sm mt-1">Finish your current season to start building your history.</p>
          </div>
        )}

        <div className="space-y-4">
          {seasons.map((season, idx) => {
            const s = getStats(season)
            return (
              <div key={season.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                {/* Season header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white font-black text-base">
                      Season {seasons.length - idx}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {displayDate(season.start_date)}
                      {season.end_date ? ` — ${displayDate(season.end_date)}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${
                    s.seasonWon
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {s.seasonWon ? '🏆 Winning' : '📉 Losing'}
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Games',   value: `${s.gameWins}–${s.gameLosses}` },
                    { label: 'Innings', value: `${s.inningWins}/${s.closedInnings}` },
                    { label: 'Best',    value: `${s.streak.count}🔥` },
                    { label: 'Goals',   value: `${s.goalsCompleted}/${s.goalsTotal}` },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="text-white font-black text-sm">{stat.value}</div>
                      <div className="text-white/40 text-[10px] mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Season goals */}
                {season.season_goals.length > 0 && (
                  <div className="border-t border-white/10 pt-3 space-y-1.5">
                    {season.season_goals.map(g => (
                      <div key={g.id} className="flex items-center gap-2">
                        <span className="text-xs flex-shrink-0">{g.completed ? '✅' : '⬜'}</span>
                        <span className={`text-xs ${g.completed ? 'text-white/70' : 'text-white/30'}`}>
                          {g.text || 'Untitled goal'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
