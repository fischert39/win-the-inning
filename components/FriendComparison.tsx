'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface MyStats {
  gameWins:   number
  gameLosses: number
  inningsWon: number
  inningsPlayed: number
}

interface FriendStats {
  username:       string
  display_name:   string | null
  game_wins:      number
  game_losses:    number
  innings_won:    number
  innings_played: number
}

interface Props {
  myUsername:  string | null
  myStats:     MyStats
  onSetUsername: (u: string) => Promise<void>
}

function WinRate({ won, played }: { won: number; played: number }) {
  const pct = played > 0 ? Math.round((won / played) * 100) : 0
  return (
    <div>
      <div className="text-lg font-black text-brand-navy tabular-nums">{won}/{played}</div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
        <div className="bg-brand-orange h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-slate-400 mt-0.5">{pct}%</div>
    </div>
  )
}

export default function FriendComparison({ myUsername, myStats, onSetUsername }: Props) {
  const [open,          setOpen]          = useState(false)
  const [usernameInput, setUsernameInput] = useState(myUsername ?? '')
  const [editingName,   setEditingName]   = useState(false)
  const [searchInput,   setSearchInput]   = useState('')
  const [friend,        setFriend]        = useState<FriendStats | null>(null)
  const [searching,     setSearching]     = useState(false)
  const [notFound,      setNotFound]      = useState(false)
  const supabase = createClient()

  async function saveUsername() {
    const u = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!u) return
    setUsernameInput(u)
    await onSetUsername(u)
    setEditingName(false)
  }

  async function searchFriend() {
    const q = searchInput.trim()
    if (!q) return
    setSearching(true)
    setNotFound(false)
    setFriend(null)
    const { data } = await supabase.rpc('get_friend_stats', { p_username: q })
    setSearching(false)
    if (data) setFriend(data as FriendStats)
    else setNotFound(true)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">👥</span>
          <div className="text-left">
            <h2 className="font-black text-base text-brand-navy">Friend Comparison</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {myUsername ? `@${myUsername}` : 'Set a username to get started'}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">

          {/* Your username */}
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Your Username</p>
            {editingName || !myUsername ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && saveUsername()}
                  placeholder="e.g. coach_mike"
                  className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand-orange text-brand-navy placeholder:text-slate-300"
                />
                <button
                  onClick={saveUsername}
                  className="bg-brand-orange text-white text-sm font-bold px-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-brand-navy font-bold text-sm">@{myUsername}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-slate-400 hover:text-brand-orange transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
            {myUsername && !editingName && (
              <p className="text-[11px] text-slate-400 mt-1.5">Share this with friends so they can compare!</p>
            )}
          </div>

          {/* Find a friend */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Find a Friend</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchFriend()}
                placeholder="Enter their username"
                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand-orange text-brand-navy placeholder:text-slate-300"
              />
              <button
                onClick={searchFriend}
                disabled={searching}
                className="bg-brand-navy text-white text-sm font-bold px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {searching ? '…' : 'Go'}
              </button>
            </div>
            {notFound && (
              <p className="text-xs text-slate-400 mt-2">No player found with that username.</p>
            )}
          </div>

          {/* Side-by-side comparison */}
          {friend && (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="bg-brand-navy/5 px-4 py-2.5 text-center">
                  <p className="text-[11px] font-black text-brand-navy uppercase tracking-wide">You</p>
                  {myUsername && <p className="text-[10px] text-slate-400">@{myUsername}</p>}
                </div>
                <div className="bg-brand-orange/5 px-4 py-2.5 text-center">
                  <p className="text-[11px] font-black text-brand-orange uppercase tracking-wide">
                    {friend.display_name ?? friend.username}
                  </p>
                  <p className="text-[10px] text-slate-400">@{friend.username}</p>
                </div>
              </div>

              {/* Game record */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-slate-400 mb-1">Games</p>
                  <p className="font-black text-brand-navy">{myStats.gameWins}W–{myStats.gameLosses}L</p>
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-slate-400 mb-1">Games</p>
                  <p className="font-black text-brand-orange">{friend.game_wins}W–{friend.game_losses}L</p>
                </div>
              </div>

              {/* Inning win rate */}
              <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-slate-400 mb-1">Innings Won</p>
                  <WinRate won={myStats.inningsWon} played={myStats.inningsPlayed} />
                </div>
                <div className="px-4 py-3 text-center">
                  <p className="text-[10px] text-slate-400 mb-1">Innings Won</p>
                  <WinRate won={friend.innings_won} played={friend.innings_played} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
