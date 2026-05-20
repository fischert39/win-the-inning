'use client'

import { useState } from 'react'
import type { Sport } from '@/types'

interface Props {
  sport:       Sport
  displayName: string
  onStart:     (sport: Sport) => Promise<void>
  onSignOut:   () => void
}

export default function SeasonGate({ sport: initialSport, displayName, onStart, onSignOut }: Props) {
  const [sport,    setSport]    = useState<Sport>(initialSport)
  const [starting, setStarting] = useState(false)

  async function handleStart() {
    setStarting(true)
    await onStart(sport)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0F3460] overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-7xl block mb-5 animate-bounce-slow">
            {sport === 'baseball' ? '⚾' : '🥎'}
          </span>
          <h1 className="text-3xl font-black text-white leading-tight mb-2">
            Hey, {displayName}! 👋
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            Ready to start a new season? Set your sport, define big goals,
            and win one inning at a time.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-8">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">How it works</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🧠', label: 'Mind Out',   desc: 'Daily mental clarity task' },
              { icon: '✨', label: 'Spirit Out',  desc: 'Inner energy & purpose task' },
              { icon: '💪', label: 'Body Out',    desc: 'Physical health task' },
              { icon: '🏃', label: 'Score Runs',  desc: 'Complete your daily goals' },
            ].map(item => (
              <div key={item.label} className="bg-white/5 border border-white/8 rounded-xl p-4">
                <span className="text-2xl block mb-2">{item.icon}</span>
                <div className="text-white text-sm font-bold">{item.label}</div>
                <div className="text-white/50 text-xs mt-0.5 leading-snug">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Win conditions */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Win conditions</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-brand-orange font-black flex-shrink-0">Win Inning</span>
              <span className="text-white/60">3 outs (Mind + Spirit + Body) <span className="text-white/40">+</span> at least 1 run scored</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 font-black flex-shrink-0">Tie Inning</span>
              <span className="text-white/60">3 outs recorded, but no runs scored</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-brand-green font-black flex-shrink-0">Win Game</span>
              <span className="text-white/60">Win more innings than you lose in the week</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-brand-teal font-black flex-shrink-0">Win Season</span>
              <span className="text-white/60">Finish with more game wins than losses</span>
            </div>
          </div>
        </div>

        {/* Sport selector */}
        <div className="mb-8">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Choose your sport</p>
          <div className="flex gap-3">
            {(['softball', 'baseball'] as Sport[]).map(s => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={`flex-1 py-4 rounded-xl border-2 font-bold text-sm transition-all ${
                  sport === s
                    ? 'bg-brand-orange/20 border-brand-orange text-white'
                    : 'bg-white/5 border-white/15 text-white/70 hover:border-white/30'
                }`}
              >
                <span className="text-3xl block mb-1">{s === 'baseball' ? '⚾' : '🥎'}</span>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full bg-gradient-to-r from-brand-orange to-[#FF4500] text-white font-black text-lg py-4 rounded-2xl shadow-xl hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60"
        >
          {starting ? 'Starting…' : '⚡ Start the Season'}
        </button>

        <button
          onClick={onSignOut}
          className="w-full mt-4 text-white/30 text-sm hover:text-white/60 transition-colors py-2"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
