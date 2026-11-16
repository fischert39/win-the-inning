'use client'

import { useState, useEffect } from 'react'
import type { Profile } from '@/types'
import TeamPage         from '@/components/TeamPage'
import FriendComparison from '@/components/FriendComparison'
import FindFriends      from '@/components/FindFriends'

interface Props {
  profile:        Profile | null
  userId:         string
  record:         { wins: number; losses: number }
  inningsWon:     number
  inningsPlayed:  number
  onShare:        () => void
  onShareCard:    () => void
  onSetUsername:  (u: string) => Promise<void>
  onOpenSettings: () => void
  onUnreadChange: (count: number) => void
}

export default function SocialPage({
  profile, userId, record, inningsWon, inningsPlayed,
  onShare, onShareCard, onSetUsername, onOpenSettings, onUnreadChange,
}: Props) {
  const [copied, setCopied] = useState(false)
  // Real host of this deployment; defaults to the canonical domain for SSR and
  // is corrected on the client (avoids showing a wrong/hardcoded URL).
  const [host, setHost] = useState('win-the-inning-theta.vercel.app')
  useEffect(() => { setHost(window.location.host) }, [])

  function handleCopy() {
    navigator.clipboard.writeText(`${window.location.origin}/u/${profile!.username!}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Team section */}
      <TeamPage
        userId={userId}
        groupTeamId={profile?.group_team_id ?? null}
        onUnreadChange={onUnreadChange}
      />

      {/* Username + friend comparison (claim a username to unlock your public profile) */}
      <FriendComparison
        myUsername={profile?.username ?? null}
        myStats={{
          gameWins:      record.wins,
          gameLosses:    record.losses,
          inningsWon,
          inningsPlayed,
        }}
        onSetUsername={onSetUsername}
      />

      {/* Find other players (requires the searched player to be discoverable) */}
      <FindFriends
        isDiscoverable={profile?.is_discoverable ?? false}
        onOpenSettings={onOpenSettings}
      />

      {/* Share */}
      <div className="bg-surface rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <h2 className="font-black text-ink text-base mb-0.5">📤 Share Your Season</h2>
          <p className="text-slate-500 text-xs mb-4">Post your record, or send a scorecard image</p>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <button
            onClick={onShare}
            className="w-full flex items-center gap-3 bg-brand-orange text-white font-bold text-sm py-3.5 px-5 rounded-xl hover:bg-brand-orange-dark active:scale-[0.98] transition-all"
          >
            <span className="text-lg">📣</span>
            Share My Record
          </button>
          <button
            onClick={onShareCard}
            className="w-full flex items-center gap-3 bg-slate-100 text-slate-700 font-bold text-sm py-3.5 px-5 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all"
          >
            <span className="text-lg">🃏</span>
            Share Scorecard
          </button>
        </div>
      </div>

      {/* Public profile link */}
      {profile?.username && (
        <div className="bg-surface rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔗</span>
            <div>
              <p className="font-black text-sm text-ink">Your Public Profile</p>
              <p className="text-slate-500 text-xs">{host}/u/{profile.username}</p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className={`text-xs font-black flex-shrink-0 transition-colors ${copied ? 'text-green-600' : 'text-brand-orange hover:underline'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  )
}
