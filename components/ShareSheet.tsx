'use client'

import { useState } from 'react'

interface Props {
  username:    string | null
  displayName: string | null
  mascot:      string | null
  teamName:    string | null
  record:      { wins: number; losses: number }
  context:     'inning' | 'season'
  onClose:     () => void
}

export default function ShareSheet({ username, displayName, mascot, teamName, record, context, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  function getProfileUrl() {
    const base = window.location.origin
    return username ? `${base}/u/${username}` : base
  }

  function getShareText() {
    const url = getProfileUrl()
    return context === 'inning'
      ? `Just won my inning on Win the Inning, Win the Day! 🏆 ${record.wins}-${record.losses} this season. Can you keep up? ${url}`
      : `My season record: ${record.wins}-${record.losses} on Win the Inning, Win the Day! 💪 ${url}`
  }

  function shareToFacebook() {
    const url  = getProfileUrl()
    const text = getShareText()
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      '_blank', 'width=600,height=450,noopener'
    )
  }

  async function shareToInstagram() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Win the Inning, Win the Day', text: getShareText(), url: getProfileUrl() })
      } catch {
        // user cancelled — do nothing
      }
    } else {
      await copyLink()
      alert('Link copied! Open Instagram and paste it in your bio or story caption.')
    }
  }

  async function copyLink() {
    const url = getProfileUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for browsers that block clipboard API
      const el = document.createElement('textarea')
      el.value = url
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const name  = teamName || displayName || 'Player'
  const emoji = mascot ?? '🏆'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>

        {/* Preview card */}
        <div className="bg-gradient-to-br from-brand-navy to-brand-navy-light px-6 pt-6 pb-8 text-center">
          <div className="text-5xl mb-2">{emoji}</div>
          <h3 className="text-white font-black text-xl mb-1">{name}</h3>
          <p className="text-brand-orange font-black text-3xl mb-1">{record.wins}–{record.losses}</p>
          <p className="text-white/40 text-xs">Win the Inning, Win the Day</p>
        </div>

        <div className="px-5 py-5 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
            Share Your {context === 'inning' ? 'Inning Win 🏆' : 'Season 💪'}
          </p>

          {/* Facebook */}
          <button
            onClick={shareToFacebook}
            className="w-full flex items-center gap-3 bg-[#1877F2] text-white font-bold text-sm py-3.5 px-5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Share to Facebook
          </button>

          {/* Instagram */}
          <button
            onClick={shareToInstagram}
            className="w-full flex items-center gap-3 text-white font-bold text-sm py-3.5 px-5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Share to Instagram
          </button>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 bg-slate-100 text-slate-700 font-bold text-sm py-3.5 px-5 rounded-xl hover:bg-slate-200 active:scale-[0.98] transition-all"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </button>

          <button onClick={onClose} className="w-full text-slate-400 text-sm py-1.5 hover:text-slate-600 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
