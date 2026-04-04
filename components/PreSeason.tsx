'use client'

import { useState, useEffect } from 'react'
import type { Sport } from '@/types'

interface Props {
  sport:       Sport
  displayName: string
  onStart:     (sport: Sport, goals: string[]) => Promise<void>
  onSignOut:   () => void
}

const STEPS = 5

export default function PreSeason({ sport: initialSport, displayName, onStart, onSignOut }: Props) {
  const [step,     setStep]     = useState(0)        // 0 = detect, set in useEffect
  const [ready,    setReady]    = useState(false)
  const [sport,    setSport]    = useState<Sport>(initialSport)
  const [goals,    setGoals]    = useState(['', '', ''])
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('wti_seen_intro')
    setStep(seen ? 4 : 1)   // skip to setup if returning user
    setReady(true)
  }, [])

  function next() { setStep(s => Math.min(s + 1, STEPS)) }
  function back() { setStep(s => Math.max(s - 1, 1)) }

  function setGoal(idx: number, val: string) {
    setGoals(prev => prev.map((g, i) => i === idx ? val : g))
  }

  function addGoalRow() {
    setGoals(prev => [...prev, ''])
  }

  async function handleStart() {
    setStarting(true)
    localStorage.setItem('wti_seen_intro', '1')
    const filtered = goals.map(g => g.trim()).filter(Boolean)
    await onStart(sport, filtered)
  }

  if (!ready) return null

  const sportEmoji = sport === 'baseball' ? '⚾' : '🥎'

  // ── Step 1: Welcome ──────────────────────────────────────────
  if (step === 1) return (
    <Screen>
      <div className="text-center flex-1 flex flex-col items-center justify-center">
        <span className="text-8xl block mb-6 animate-bounce-slow">{sportEmoji}</span>
        <h1 className="text-4xl font-black text-white leading-tight mb-3">
          Win the Inning<br />Win the Day
        </h1>
        <p className="text-white/60 text-base leading-relaxed max-w-xs mx-auto">
          A season-based habit system built on the psychology of baseball.
          Each day is an inning. Each week is a game. Win enough innings and you win the season.
        </p>
      </div>
      <NavRow onNext={next} step={step} showBack={false} />
    </Screen>
  )

  // ── Step 2: Defense ──────────────────────────────────────────
  if (step === 2) return (
    <Screen>
      <div className="flex-1">
        <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Step 1 of 3</p>
        <h2 className="text-3xl font-black text-white mb-2">🛡️ Defense</h2>
        <p className="text-white/60 text-sm mb-8 leading-relaxed">
          Every day you defend with three tasks — one for your Mind, Spirit, and Body.
          Complete all three to record <span className="text-brand-orange font-bold">3 Outs</span>.
        </p>

        <div className="space-y-3 mb-8">
          {[
            { icon: '🧠', label: 'Mind',   example: 'Read for 20 minutes' },
            { icon: '✨', label: 'Spirit', example: 'Meditate or journal' },
            { icon: '💪', label: 'Body',   example: 'Work out or walk' },
          ].map(t => (
            <div key={t.label} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              <span className="text-3xl">{t.icon}</span>
              <div>
                <p className="text-white font-bold">{t.label}</p>
                <p className="text-white/50 text-sm">{t.example}</p>
              </div>
              <div className="ml-auto w-6 h-6 rounded-full border-2 border-brand-green bg-brand-green/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-brand-green" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-xl p-4 text-center">
          <p className="text-white/80 text-sm">
            3 Outs = <span className="text-brand-orange font-black">defended your day</span>.
            You can customize these tasks before each inning.
          </p>
        </div>
      </div>
      <NavRow onNext={next} onBack={back} step={step} />
    </Screen>
  )

  // ── Step 3: Offense ──────────────────────────────────────────
  if (step === 3) return (
    <Screen>
      <div className="flex-1">
        <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Step 2 of 3</p>
        <h2 className="text-3xl font-black text-white mb-2">🏃 Offense</h2>
        <p className="text-white/60 text-sm mb-8 leading-relaxed">
          Set your daily goals. Each completed goal is a <span className="text-brand-orange font-bold">hit</span> that advances runners. Drive runners home to score runs.
        </p>

        <div className="grid grid-cols-4 gap-2 mb-8">
          {[
            { key: 'S',  name: 'Single',   color: 'bg-sky-500/20 border-sky-400/30 text-sky-300',       desc: '1 base' },
            { key: '2B', name: 'Double',   color: 'bg-teal-500/20 border-teal-400/30 text-teal-300',     desc: '2 bases' },
            { key: '3B', name: 'Triple',   color: 'bg-purple-500/20 border-purple-400/30 text-purple-300', desc: '3 bases' },
            { key: 'HR', name: 'Home Run', color: 'bg-brand-orange/20 border-brand-orange/30 text-brand-orange', desc: 'Score!' },
          ].map(h => (
            <div key={h.key} className={`rounded-xl border p-3 text-center ${h.color}`}>
              <p className="font-black text-xl mb-0.5">{h.key}</p>
              <p className="text-xs opacity-80">{h.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-3">
          <p className="text-white/80 text-sm leading-relaxed">
            <span className="font-bold text-white">WIN the inning</span> = 3 Outs + at least 1 run scored.<br />
            <span className="font-bold text-yellow-400">TIE</span> = 3 Outs but no runs.<br />
            <span className="font-bold text-red-400">LOSS</span> = fewer than 3 outs.
          </p>
        </div>
      </div>
      <NavRow onNext={next} onBack={back} step={step} />
    </Screen>
  )

  // ── Step 4: The Season ────────────────────────────────────────
  if (step === 4) return (
    <Screen>
      <div className="flex-1">
        <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Step 3 of 3</p>
        <h2 className="text-3xl font-black text-white mb-2">🏆 The Season</h2>
        <p className="text-white/60 text-sm mb-8 leading-relaxed">
          Innings become games. Games build your season. Win more than you lose and you&apos;re a champion.
        </p>

        <div className="space-y-3 mb-8">
          {[
            { icon: '🥎', label: 'Inning = 1 Day',   desc: 'Defense + Offense every day' },
            { icon: '📅', label: 'Game = 1 Week',    desc: '7 innings, Mon–Sun' },
            { icon: '📈', label: 'Season = All Time', desc: 'Win more games than you lose' },
          ].map(r => (
            <div key={r.label} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-3xl">{r.icon}</span>
              <div>
                <p className="text-white font-bold text-sm">{r.label}</p>
                <p className="text-white/50 text-xs">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4 text-center">
          <p className="text-white/80 text-sm">
            You can use a <span className="text-sky-400 font-bold">☔ Rain Delay</span> once per week to skip a day without a loss. Life happens.
          </p>
        </div>
      </div>
      <NavRow onNext={next} onBack={back} step={step} />
    </Screen>
  )

  // ── Step 5: Season Setup ──────────────────────────────────────
  return (
    <Screen>
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-2xl font-black text-white mb-1">⚡ Start Your Season</h2>
        <p className="text-white/50 text-sm mb-6">Hey {displayName}! Set up your season before we begin.</p>

        {/* Sport */}
        <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Choose your sport</p>
        <div className="flex gap-3 mb-6">
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

        {/* Season goals */}
        <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Season Goals <span className="normal-case font-normal text-white/30">(optional)</span></p>
        <div className="space-y-2 mb-3">
          {goals.map((g, i) => (
            <input
              key={i}
              type="text"
              value={g}
              onChange={e => setGoal(i, e.target.value)}
              placeholder={`Goal ${i + 1}… e.g. "Run a 5K"`}
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-orange/50"
            />
          ))}
        </div>
        {goals.length < 7 && (
          <button
            onClick={addGoalRow}
            className="text-white/40 hover:text-white/70 text-sm font-semibold mb-6 transition-colors"
          >
            + Add another goal
          </button>
        )}
      </div>

      <div className="pt-4 space-y-3">
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full bg-gradient-to-r from-brand-orange to-[#FF4500] text-white font-black text-lg py-4 rounded-2xl shadow-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {starting ? 'Starting…' : `⚡ Start the Season`}
        </button>
        <button onClick={onSignOut} className="w-full text-white/30 text-sm hover:text-white/50 transition-colors py-1">
          Sign out
        </button>
      </div>
    </Screen>
  )
}

// ── Shared layout ────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0F3460] flex flex-col">
      <div className="max-w-xl mx-auto w-full px-6 py-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  )
}

function NavRow({
  onNext, onBack, step, showBack = true,
}: {
  onNext: () => void
  onBack?: () => void
  step: number
  showBack?: boolean
}) {
  return (
    <div className="pt-6 flex items-center justify-between">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map(i => (
          <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-brand-orange' : 'bg-white/20'}`} />
        ))}
      </div>
      <div className="flex items-center gap-3">
        {showBack && onBack && (
          <button onClick={onBack} className="text-white/40 hover:text-white/70 text-sm font-semibold transition-colors px-3 py-2">
            ← Back
          </button>
        )}
        <button
          onClick={onNext}
          className="bg-brand-orange text-white font-black text-sm px-8 py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
