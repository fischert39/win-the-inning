'use client'

import { useState } from 'react'
import type { Profile, Sport } from '@/types'

interface Props {
  record:       { wins: number; losses: number }
  streak:       { type: 'WIN' | 'LOSS' | null; count: number }
  sport:        Sport
  profile:      Profile | null
  onEndSeason:  () => void
  onSignOut:    () => void
}

export default function AppHeader({ record, streak, sport, profile, onEndSeason, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const sportEmoji = sport === 'baseball' ? '⚾' : '🥎'
  const avatar = profile?.avatar_url
  const name   = profile?.display_name

  return (
    <header className="bg-brand-navy text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: logo + title */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">{sportEmoji}</span>
          <span className="font-black text-sm leading-tight hidden sm:block">
            Win the Inning
          </span>
        </div>

        {/* Center: season record + streak */}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-black tabular-nums tracking-tight">
            {record.wins}–{record.losses}
          </span>
          <span className="text-white/50 text-[10px] font-semibold uppercase tracking-widest -mt-0.5">
            Season Record
          </span>
          {streak.type && streak.count > 0 && (
            <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${
              streak.type === 'WIN'
                ? 'bg-brand-orange/20 text-brand-orange'
                : 'bg-red-500/20 text-red-400'
            }`}>
              {streak.type === 'WIN' ? '🔥' : '📉'} {streak.count} in a row
            </span>
          )}
        </div>

        {/* Right: avatar + menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {avatar ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatar} alt={name ?? 'User'} className="w-8 h-8 rounded-full ring-2 ring-white/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center font-bold text-sm">
                {name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span className="text-white/60 text-xs hidden sm:block">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in">
              {name && (
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-brand-navy font-bold text-sm truncate">{name}</p>
                  <p className="text-slate-400 text-xs">Season in progress</p>
                </div>
              )}
              <button
                onClick={() => { setMenuOpen(false); onEndSeason() }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                🏁 End Season
              </button>
              <button
                onClick={() => { setMenuOpen(false); onSignOut() }}
                className="w-full text-left px-4 py-2.5 text-sm text-brand-red hover:bg-red-50 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
