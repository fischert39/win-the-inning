'use client'

import { useState, useMemo } from 'react'
import type { FullSeason, Profile } from '@/types'
import { computeAchievements } from '@/lib/achievements'
import { inningResult, simulateRuns } from '@/lib/game-logic'
import SeasonTrends     from '@/components/SeasonTrends'
import Achievements     from '@/components/Achievements'
import TeamAchievements from '@/components/TeamAchievements'

interface Props {
  season:        FullSeason
  record:        { wins: number; losses: number }
  profile:       Profile | null
  inningsWon:    number
  inningsPlayed: number
  onPastSeasons: () => void
  onClearData:   () => void
}

function pct(num: number, den: number) {
  return den === 0 ? 0 : Math.round((num / den) * 100)
}

function Bar({ value, total, color }: { value: number; total: number; color: string }) {
  const p = pct(value, total)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-10 text-right text-slate-600">{p}%</span>
    </div>
  )
}

function CollapsibleCard({ icon, title, sub, children }: {
  icon: string; title: string; sub: string; children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div className="text-left">
            <h2 className="font-black text-base text-brand-navy">{title}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  )
}

export default function StatsPage({
  season, record, profile, inningsWon, inningsPlayed,
  onPastSeasons, onClearData,
}: Props) {
  const achievements = useMemo(() => computeAchievements(season), [season])
  const unlocked     = achievements.filter(a => a.unlocked).length

  // ─── Compute stats from season data ───────────────────────────────────────
  const allInnings   = season.games.flatMap(g => g.innings)
  const closedInnings = allInnings.filter(i => i.status === 'CLOSED' && !i.is_rain_delay)
  const rainDelays   = allInnings.filter(i => i.is_rain_delay).length

  // Defense
  const mindTotal   = closedInnings.filter(i => i.mind_task).length
  const mindDone    = closedInnings.filter(i => i.mind_task   && i.mind_completed).length
  const spiritTotal = closedInnings.filter(i => i.spirit_task).length
  const spiritDone  = closedInnings.filter(i => i.spirit_task && i.spirit_completed).length
  const bodyTotal   = closedInnings.filter(i => i.body_task).length
  const bodyDone    = closedInnings.filter(i => i.body_task   && i.body_completed).length
  const defTotal    = mindTotal + spiritTotal + bodyTotal
  const defDone     = mindDone + spiritDone + bodyDone

  // Offense
  const allGoals      = allInnings.flatMap(i => i.offense_goals)
  const totalGoals    = allGoals.length
  const completedGoals = allGoals.filter(g => g.completed).length
  const singles       = allGoals.filter(g => g.completed && g.hit_type === 'single').length
  const doubles       = allGoals.filter(g => g.completed && g.hit_type === 'double').length
  const triples       = allGoals.filter(g => g.completed && g.hit_type === 'triple').length
  const homers        = allGoals.filter(g => g.completed && g.hit_type === 'homer').length
  const hitTotal      = singles + doubles + triples + homers

  const totalRuns = closedInnings.reduce((sum, i) => sum + simulateRuns(i.offense_goals), 0)
  const avgGoalsPerInning = closedInnings.length > 0
    ? (totalGoals / closedInnings.length).toFixed(1)
    : '0.0'
  const avgRunsPerInning = closedInnings.length > 0
    ? (totalRuns / closedInnings.length).toFixed(1)
    : '0.0'

  // Streak
  const sortedClosed = [...closedInnings].sort((a, b) => a.date.localeCompare(b.date))
  let bestStreak = 0, curStreak = 0
  for (const i of sortedClosed) {
    if (inningResult(i) === 'WIN') { curStreak++; bestStreak = Math.max(bestStreak, curStreak) }
    else curStreak = 0
  }

  const gameWinRate = pct(record.wins, record.wins + record.losses)
  const inningWinRate = pct(inningsWon, inningsPlayed)

  return (
    <div className="space-y-4 animate-slide-up">

      {/* ── Season summary banner ── */}
      <div className="bg-brand-navy rounded-2xl p-5 text-white">
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Current Season</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="text-center bg-white/5 rounded-xl py-3">
            <p className="text-2xl font-black tabular-nums">{record.wins}–{record.losses}</p>
            <p className="text-white/40 text-[10px] mt-0.5">Game Record</p>
            <p className="text-brand-green text-xs font-bold mt-0.5">{gameWinRate}% win rate</p>
          </div>
          <div className="text-center bg-white/5 rounded-xl py-3">
            <p className="text-2xl font-black tabular-nums">{inningsWon}/{inningsPlayed}</p>
            <p className="text-white/40 text-[10px] mt-0.5">Innings Won</p>
            <p className="text-brand-orange text-xs font-bold mt-0.5">{inningWinRate}% win rate</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-white/5 rounded-xl py-2.5">
            <p className="text-lg font-black tabular-nums">{pct(defDone, defTotal)}%</p>
            <p className="text-white/40 text-[10px] mt-0.5">Defense</p>
          </div>
          <div className="text-center bg-white/5 rounded-xl py-2.5">
            <p className="text-lg font-black tabular-nums">{pct(completedGoals, totalGoals)}%</p>
            <p className="text-white/40 text-[10px] mt-0.5">Goals Done</p>
          </div>
          <div className="text-center bg-white/5 rounded-xl py-2.5">
            <p className="text-lg font-black tabular-nums">{unlocked}/{achievements.length}</p>
            <p className="text-white/40 text-[10px] mt-0.5">Badges</p>
          </div>
        </div>
      </div>

      {/* ── Individual Achievements ── */}
      <Achievements achievements={achievements} initialOpen />

      {/* ── Team Achievements ── */}
      <TeamAchievements />

      {/* ── Season Trends ── */}
      <SeasonTrends games={season.games} />

      {/* ── Defense Breakdown ── */}
      <CollapsibleCard
        icon="🛡️"
        title="Defense Breakdown"
        sub={`${pct(defDone, defTotal)}% overall · ${defDone}/${defTotal} tasks completed`}
      >
        <div className="space-y-5 pt-1">
          {[
            { label: 'Mind',   done: mindDone,   total: mindTotal,   color: '#9B5DE5', emoji: '🧠' },
            { label: 'Spirit', done: spiritDone, total: spiritTotal, color: '#00B4D8', emoji: '✝️' },
            { label: 'Body',   done: bodyDone,   total: bodyTotal,   color: '#2DC653', emoji: '💪' },
          ].map(({ label, done, total, color, emoji }) => (
            <div key={label}>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm font-bold text-brand-navy">{emoji} {label}</span>
                <span className="text-xs text-slate-400 tabular-nums">{done}/{total}</span>
              </div>
              <Bar value={done} total={total} color={color} />
            </div>
          ))}

          <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-brand-navy font-black text-base">{pct(defDone, defTotal)}%</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Overall</p>
            </div>
            <div className="text-center">
              <p className="text-brand-navy font-black text-base">{rainDelays}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">Rain Delays</p>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Offense Breakdown ── */}
      <CollapsibleCard
        icon="⚡"
        title="Offense Breakdown"
        sub={`${completedGoals}/${totalGoals} goals · ${totalRuns} total runs scored`}
      >
        <div className="space-y-5 pt-1">

          {/* Goal completion */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm font-bold text-brand-navy">Goal Completion</span>
              <span className="text-xs text-slate-400 tabular-nums">{completedGoals}/{totalGoals}</span>
            </div>
            <Bar value={completedGoals} total={totalGoals} color="#FF6B35" />
          </div>

          {/* Hit distribution */}
          {hitTotal > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hit Distribution</p>
              {[
                { label: '1B  Single', count: singles, color: '#2DC653' },
                { label: '2B  Double', count: doubles, color: '#00B4D8' },
                { label: '3B  Triple', count: triples, color: '#9B5DE5' },
                { label: 'HR  Homer',  count: homers,  color: '#FF6B35' },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 font-mono">{label}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{count} &nbsp;({pct(count, hitTotal)}%)</span>
                  </div>
                  <Bar value={count} total={hitTotal} color={color} />
                </div>
              ))}
            </div>
          )}

          {/* Footer stats */}
          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: 'Total Runs',      value: totalRuns },
              { label: 'Avg Runs/Inning', value: avgRunsPerInning },
              { label: 'Avg Goals/Inning', value: avgGoalsPerInning },
              { label: 'Best Win Streak', value: `${bestStreak}` },
            ].map(s => (
              <div key={s.label} className="text-center bg-slate-50 rounded-xl py-3">
                <p className="text-brand-navy font-black text-base">{s.value}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Past Seasons ── */}
      <button
        onClick={onPastSeasons}
        className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div className="text-left">
            <p className="font-black text-base text-brand-navy">Past Seasons</p>
            <p className="text-slate-400 text-xs mt-0.5">View your full history</p>
          </div>
        </div>
        <span className="text-slate-300 text-lg">›</span>
      </button>

      {/* ── Clear All Data ── */}
      <button
        onClick={onClearData}
        className="w-full bg-white rounded-2xl shadow-sm border border-red-100 px-5 py-4 flex items-center justify-between hover:bg-red-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🗑️</span>
          <div className="text-left">
            <p className="font-black text-base text-red-500">Clear All Data</p>
            <p className="text-slate-400 text-xs mt-0.5">Permanently delete all seasons &amp; stats</p>
          </div>
        </div>
        <span className="text-red-300 text-lg">›</span>
      </button>
    </div>
  )
}
