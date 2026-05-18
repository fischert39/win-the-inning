'use client'

import { useState } from 'react'
import type { Profile } from '@/types'
import TeamPage from '@/components/TeamPage'

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
  profile, userId, onShare, onShareCard, onUnreadChange,
}: Props) {
  const [copied, setCopied] = useState(false)

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
        displayName={profile?.display_name ?? null}
        groupTeamId={profile?.group_team_id ?? null}
        onUnreadChange={onUnreadChange}
      />

      {/* Share */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <h2 className="font-black text-brand-navy text-base mb-0.5">📤 Share Your Season</h2>
          <p className="text-slate-400 text-xs mb-4">Post your progress to social media</p>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <button
            onClick={onShare}
            className="w-full flex items-center gap-3 bg-[#1877F2] text-white font-bold text-sm py-3.5 px-5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Share to Facebook
          </button>
          <button
            onClick={onShare}
            className="w-full flex items-center gap-3 text-white font-bold text-sm py-3.5 px-5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Share to Instagram
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔗</span>
            <div>
              <p className="font-black text-sm text-brand-navy">Your Public Profile</p>
              <p className="text-slate-400 text-xs">win-the-inning.vercel.app/u/{profile.username}</p>
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
