'use client'

import { useState, useEffect } from 'react'
import type { Profile, Sport } from '@/types'

interface Props {
  record:          { wins: number; losses: number }
  streak:          { type: 'WIN' | 'LOSS' | null; count: number }
  sport:           Sport
  profile:         Profile | null
  onPastSeasons:   () => void
  onEditTeam:      () => void
  onEndSeason:     () => void
  onSignOut:       () => void
}

export default function AppHeader({ record, streak, sport, profile, onPastSeasons, onEditTeam, onEndSeason, onSignOut }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark,     setDark]     = useState(false)
  const sportEmoji = sport === 'baseball' ? '⚾' : '🥎'
  const avatar     = profile?.avatar_url
  const name       = profile?.display_name
  const teamName   = profile?.team_name
  const mascot     = profile?.mascot

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem('wti_theme', next ? 'dark' : 'light') } catch(e) {}
  }

  return (
    <header className="bg-brand-navy text-white sticky top-0 z-40 border-b border-white/5">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: mascot + team name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl">{mascot ?? sportEmoji}</span>
          <div className="min-w-0">
            {teamName ? (
              <>
                <p className="font-bold text-sm leading-tight truncate max-w-[120px]">{teamName}</p>
                <p className="text-white/30 text-[10px] leading-tight tracking-wide">Win the Inning</p>
              </>
            ) : (
              <span className="font-bold text-sm leading-tight hidden sm:block">Win the Inning</span>
            )}
          </div>
        </div>

        {/* Center: season record + streak */}
        <div className="flex flex-col items-center">
          <span className="text-2xl font-extrabold tabular-nums tracking-tight">
            {record.wins}–{record.losses}
          </span>
          <span className="text-white/40 text-[10px] font-medium uppercase tracking-widest -mt-0.5">
            Season Record
          </span>
          {streak.type === 'LOSS' && streak.count > 0 && (
            <span className="text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
              📉 {streak.count} in a row
            </span>
          )}
        </div>

        {/* Right: dark toggle + avatar + menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="w-8 h-8 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center transition-colors text-base"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              {avatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatar} alt={name ?? 'User'} className="w-8 h-8 rounded-full ring-2 ring-white/20 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand-orange flex items-center justify-center font-bold text-sm">
                  {name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <svg className="w-3.5 h-3.5 text-white/40 hidden sm:block" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in dark:bg-slate-800 dark:border-slate-700">
                {name && (
                  <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-brand-navy font-semibold text-sm truncate">{name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">Season in progress</p>
                  </div>
                )}
                <div className="py-1">
                  <button
                    onClick={() => { setMenuOpen(false); onEditTeam() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-base">🏟️</span> Edit Team
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onPastSeasons() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-base">📋</span> Past Seasons
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onEndSeason() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-base">🏁</span> End Season
                  </button>
                  <div className="border-t border-slate-100 mt-1 pt-1 dark:border-slate-700">
                    <button
                      onClick={() => { setMenuOpen(false); onSignOut() }}
                      className="w-full text-left px-4 py-2.5 text-sm text-brand-red hover:bg-red-50 transition-colors flex items-center gap-3"
                    >
                      <span className="text-base">👋</span> Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
