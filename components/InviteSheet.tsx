'use client'

import { useState } from 'react'

interface Props {
  teamName:    string
  inviteCode:  string
  onClose:     () => void
}

export default function InviteSheet({ teamName, inviteCode, onClose }: Props) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const joinUrl = `${window.location.origin}/join/${inviteCode}`

  async function handleNativeShare() {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: `Join "${teamName}" on Win the Inning`,
        text:  `I'm tracking my daily goals on Win the Inning — join my team and let's hold each other accountable!`,
        url:   joinUrl,
      })
    } catch {
      // User cancelled or share failed — no-op
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(joinUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(inviteCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2500)
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-brand-navy font-black text-lg">Invite to {teamName}</h2>
              <p className="text-slate-400 text-sm mt-0.5">Share any way you like</p>
            </div>
            <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-2xl leading-none mt-0.5 transition-colors">×</button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          {/* Native share — best option on mobile */}
          {canNativeShare && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-4 bg-brand-orange text-white font-bold py-4 px-5 rounded-xl hover:bg-brand-orange-dark active:scale-[0.98] transition-all"
            >
              <span className="text-2xl leading-none">📱</span>
              <div className="text-left">
                <p className="text-sm font-black">Share via…</p>
                <p className="text-xs text-white/70 font-normal">Messages, WhatsApp, Instagram &amp; more</p>
              </div>
            </button>
          )}

          {/* Copy join link */}
          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center gap-4 border font-bold py-4 px-5 rounded-xl active:scale-[0.98] transition-all ${
              copiedLink
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-brand-orange hover:text-brand-orange'
            }`}
          >
            <span className="text-2xl leading-none">{copiedLink ? '✅' : '🔗'}</span>
            <div className="text-left">
              <p className="text-sm font-black">{copiedLink ? 'Link copied!' : 'Copy invite link'}</p>
              <p className="text-xs text-slate-400 font-normal truncate">{joinUrl}</p>
            </div>
          </button>

          {/* Invite code */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Or share the code</p>
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono font-black text-2xl text-brand-navy tracking-[0.2em]">
                {inviteCode}
              </span>
              <button
                onClick={handleCopyCode}
                className={`text-xs font-black px-3 py-1.5 rounded-lg transition-all ${
                  copiedCode
                    ? 'bg-green-100 text-green-700'
                    : 'bg-white border border-slate-200 text-brand-orange hover:border-brand-orange'
                }`}
              >
                {copiedCode ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">They enter this in the app under Social → Join a Team</p>
          </div>

          {/* Email — coming soon */}
          <button
            disabled
            className="w-full flex items-center gap-4 border border-dashed border-slate-200 text-slate-300 font-bold py-4 px-5 rounded-xl cursor-not-allowed"
          >
            <span className="text-2xl leading-none">📧</span>
            <div className="text-left">
              <p className="text-sm font-black">Send email invite</p>
              <p className="text-xs font-normal">Coming soon</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
