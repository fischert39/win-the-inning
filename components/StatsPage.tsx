'use client'

import type { FullSeason, Profile } from '@/types'
import { computeAchievements } from '@/lib/achievements'
import SeasonTrends     from '@/components/SeasonTrends'
import Achievements     from '@/components/Achievements'
import FriendComparison from '@/components/FriendComparison'
import FindFriends      from '@/components/FindFriends'

interface Props {
  season:          FullSeason
  record:          { wins: number; losses: number }
  profile:         Profile | null
  inningsWon:      number
  inningsPlayed:   number
  onPastSeasons:   () => void
  onSetUsername:   (u: string) => Promise<void>
  onClearData:     () => void
  onShare:         () => void
  onOpenSettings:  () => void
}

export default function StatsPage({
  season, record, profile, inningsWon, inningsPlayed,
  onPastSeasons, onSetUsername, onClearData, onShare, onOpenSettings,
}: Props) {
  const achievements = computeAchievements(season)
  const unlocked     = achievements.filter(a => a.unlocked).length

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Season summary banner */}
      <div className="bg-brand-navy rounded-2xl p-5 text-white">
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-3">Current Season</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-black tabular-nums">{record.wins}–{record.losses}</p>
            <p className="text-white/40 text-[10px] mt-0.5">Game Record</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black tabular-nums">{inningsWon}/{inningsPlayed}</p>
            <p className="text-white/40 text-[10px] mt-0.5">Innings Won</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black tabular-nums">{unlocked}/{ achievements.length}</p>
            <p className="text-white/40 text-[10px] mt-0.5">Badges</p>
          </div>
        </div>
      </div>

      {/* Achievements — default open on stats page */}
      <Achievements achievements={achievements} initialOpen />

      {/* Season Trends */}
      <SeasonTrends games={season.games} />

      {/* Share season */}
      <button
        onClick={onShare}
        className="w-full bg-gradient-to-r from-brand-orange to-[#FF4500] text-white rounded-2xl px-5 py-4 flex items-center justify-between hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📤</span>
          <div className="text-left">
            <p className="font-black text-base">Share My Season</p>
            <p className="text-white/70 text-xs mt-0.5">Post to Facebook or Instagram</p>
          </div>
        </div>
        <span className="text-white/70 text-lg">›</span>
      </button>

      {/* Find Friends */}
      <FindFriends
        isDiscoverable={profile?.is_discoverable ?? false}
        onOpenSettings={onOpenSettings}
      />

      {/* Friend Comparison */}
      <FriendComparison
        myUsername={profile?.username ?? null}
        myStats={{ gameWins: record.wins, gameLosses: record.losses, inningsWon, inningsPlayed }}
        onSetUsername={onSetUsername}
      />

      {/* Past Seasons */}
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

      {/* Clear All Data */}
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
