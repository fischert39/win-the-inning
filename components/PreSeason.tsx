'use client'

import { useState, useEffect } from 'react'
import type { Sport } from '@/types'
import { MASCOTS } from '@/components/TeamSettings'
import PaletteSelector from '@/components/PaletteSelector'
import { buildPaletteString } from '@/lib/palettes'
import { GOAL_PRESETS } from '@/lib/presets'

interface SeasonOptions {
  teamName:          string
  mascot:            string
  teamPalette:       string
  lengthWeeks:       number
  successDefinition: string
  obstacle:          string
  dailyBibleVerse:   boolean
  autoCarryTasks:    boolean
}

interface Props {
  sport:       Sport
  displayName: string
  onStart:     (sport: Sport, goals: string[], opts: SeasonOptions) => Promise<void>
  onSignOut:   () => void
}

const INTRO_STEPS = 4
const TOTAL_STEPS = 6  // 4 intro + step 5 (team) + step 6 (goals/vision)

const WEEK_OPTIONS = [4, 8, 12, 16, 26]

export default function PreSeason({ sport: initialSport, displayName, onStart, onSignOut }: Props) {
  const [step,     setStep]     = useState(0)
  const [ready,    setReady]    = useState(false)
  const [starting, setStarting] = useState(false)

  // Step 5: Team setup
  const [sport,        setSport]        = useState<Sport>(initialSport)
  const [teamName,     setTeamName]     = useState('')
  const [mascot,       setMascot]       = useState(MASCOTS[0].emoji)
  const [teamPalette,  setTeamPalette]  = useState(buildPaletteString('orange', 'navy'))

  // Step 6: Season vision
  const [lengthWeeks,        setLengthWeeks]        = useState(12)
  const [goals,              setGoals]              = useState(['', '', ''])
  const [successDefinition,  setSuccessDefinition]  = useState('')
  const [obstacle,           setObstacle]           = useState('')
  const [dailyBibleVerse,    setDailyBibleVerse]    = useState(false)
  const [autoCarryTasks,     setAutoCarryTasks]     = useState(false)

  useEffect(() => {
    setStep(1)
    setReady(true)
  }, [])

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function back() { setStep(s => Math.max(s - 1, 1)) }

  function setGoal(idx: number, val: string) {
    setGoals(prev => prev.map((g, i) => i === idx ? val : g))
  }
  function addGoalRow() { setGoals(prev => [...prev, '']) }
  function togglePresetGoal(text: string) {
    if (goals.includes(text)) {
      setGoals(prev => prev.filter(g => g !== text))
    } else {
      const empties = goals.filter(g => g.trim() === '')
      if (empties.length > 0) {
        setGoals(prev => {
          const copy = [...prev]
          const idx  = copy.findIndex(g => g.trim() === '')
          copy[idx]  = text
          return copy
        })
      } else {
        setGoals(prev => [...prev, text])
      }
    }
  }

  async function handleStart() {
    setStarting(true)
    const filtered = goals.map(g => g.trim()).filter(Boolean)
    await onStart(sport, filtered, { teamName: teamName.trim(), mascot, teamPalette, lengthWeeks, successDefinition: successDefinition.trim(), obstacle: obstacle.trim(), dailyBibleVerse, autoCarryTasks })
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
        <p className="text-white/70 text-base leading-relaxed max-w-sm mx-auto">
          People change when they have a clear structure, believe they can improve, and have others in their corner.
          Win the Inning gives you all three — wrapped in the most compelling competitive framework ever invented: a baseball/softball season.
          Each day is an inning. Each week is a game. Win enough of both and you win something bigger: the version of yourself you&apos;ve been working toward.
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
            { key: '1B', name: 'Single',   color: 'bg-sky-500/20 border-sky-400/30 text-sky-300',       desc: '1 base' },
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

        <div className="space-y-2">
          <div className="bg-brand-orange/10 border border-brand-orange/20 rounded-xl p-4 text-center">
            <p className="text-white/80 text-sm">
              Set up a whole week in one sitting with <span className="text-brand-orange font-bold">📋 Plan the Game</span> — assign your outs and goals to each day before the week starts.
            </p>
          </div>
          <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4 text-center">
            <p className="text-white/80 text-sm">
              You can use a <span className="text-sky-400 font-bold">☔ Rain Delay</span> once per week to skip a day without a loss.
            </p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
            <p className="text-white/80 text-sm">
              Win all 7 innings for a <span className="text-amber-400 font-bold">🎽 Perfect Week</span> and earn a Pinch Hitter token — use it on a tough day to add an automatic Out.
            </p>
          </div>
        </div>
      </div>
      <NavRow onNext={next} onBack={back} step={step} />
    </Screen>
  )

  // ── Step 5: Team Setup ────────────────────────────────────────
  if (step === 5) return (
    <Screen>
      <div className="flex-1 overflow-y-auto space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">🏟️ Build Your Team</h2>
          <p className="text-white/50 text-sm">Hey {displayName}! Let&apos;s set up your team first.</p>
        </div>

        {/* Sport */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Choose your sport</p>
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

        {/* Team Name */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">
            Team Name <span className="normal-case font-normal text-white/30">(optional)</span>
          </p>
          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder={`e.g. The ${sport === 'baseball' ? 'Thunder Hawks' : 'Fire Foxes'}`}
            maxLength={30}
            autoCorrect="off"
            autoCapitalize="words"
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-orange/50"
          />
        </div>

        {/* Mascot */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Mascot</p>
          <div className="grid grid-cols-7 gap-1.5">
            {MASCOTS.map(m => (
              <button
                key={m.emoji}
                onClick={() => setMascot(m.emoji)}
                title={m.name}
                className={`flex items-center justify-center p-2.5 rounded-xl border-2 transition-all active:scale-90 ${
                  mascot === m.emoji
                    ? 'border-brand-orange bg-brand-orange/15'
                    : 'border-white/10 bg-white/5 hover:border-white/25'
                }`}
              >
                <span className="text-2xl leading-none">{m.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Team colors */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">Team Colors</p>
          <PaletteSelector value={teamPalette} onChange={setTeamPalette} dark />
        </div>
      </div>
      <NavRow onNext={next} onBack={back} step={step} isSetup />
    </Screen>
  )

  // ── Step 6: Season Vision ─────────────────────────────────────
  return (
    <Screen>
      <div className="flex-1 overflow-y-auto space-y-5">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">⚡ Season Vision</h2>
          <p className="text-white/50 text-sm">Define your goals and set yourself up to win.</p>
        </div>

        {/* Season length */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">How many weeks?</p>
          <div className="flex gap-2">
            {WEEK_OPTIONS.map(w => (
              <button
                key={w}
                onClick={() => setLengthWeeks(w)}
                className={`flex-1 py-2.5 rounded-xl border-2 font-black text-sm transition-all ${
                  lengthWeeks === w
                    ? 'border-brand-orange bg-brand-orange/20 text-white'
                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <p className="text-white/30 text-xs mt-1.5 text-center">{lengthWeeks} weeks = {lengthWeeks} games</p>
          <p className="text-brand-orange/70 text-xs mt-2 text-center">
            💡 First time? We recommend starting with 4 or 8 weeks to learn the system.
          </p>
        </div>

        {/* Season goals with preset library */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">
            Season Goals <span className="normal-case font-normal text-white/30">(optional)</span>
          </p>
          <div className="space-y-1.5 mb-3">
            {goals.map((g, i) => (
              <input
                key={i}
                type="text"
                value={g}
                onChange={e => setGoal(i, e.target.value)}
                placeholder={`Goal ${i + 1}… e.g. "Run a 5K"`}
                autoCorrect="off"
                autoCapitalize="sentences"
                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-orange/50"
              />
            ))}
          </div>
          {goals.length < 7 && (
            <button
              onClick={addGoalRow}
              className="text-white/40 hover:text-white/70 text-sm font-semibold mb-3 transition-colors"
            >
              + Add goal
            </button>
          )}

          {/* Preset library */}
          <div className="space-y-2">
            {GOAL_PRESETS.map(cat => (
              <div key={cat.category}>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-wider mb-1.5">{cat.category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.goals.map(g => {
                    const selected = goals.includes(g)
                    return (
                      <button
                        key={g}
                        onClick={() => togglePresetGoal(g)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                          selected
                            ? 'bg-brand-orange/20 border-brand-orange text-white'
                            : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
                        }`}
                      >
                        {selected ? '✓ ' : ''}{g}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Define success */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">
            What does success look like? <span className="normal-case font-normal text-white/30">(optional)</span>
          </p>
          <textarea
            value={successDefinition}
            onChange={e => setSuccessDefinition(e.target.value)}
            placeholder="At the end of this season, I will have…"
            rows={2}
            autoCorrect="off"
            autoCapitalize="sentences"
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-orange/50 resize-none"
          />
        </div>

        {/* Define obstacles */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">
            What might stop you? <span className="normal-case font-normal text-white/30">(optional)</span>
          </p>
          <textarea
            value={obstacle}
            onChange={e => setObstacle(e.target.value)}
            placeholder="My biggest challenge will be… and I will overcome it by…"
            rows={2}
            autoCorrect="off"
            autoCapitalize="sentences"
            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand-orange/50 resize-none"
          />
        </div>

        {/* Auto-carry incomplete tasks */}
        <button
          onClick={() => setAutoCarryTasks(v => !v)}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
            autoCarryTasks
              ? 'border-brand-orange bg-brand-orange/10'
              : 'border-white/10 bg-white/5'
          }`}
        >
          <span className="text-2xl flex-shrink-0">🔄</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Auto-carry incomplete tasks</p>
            <p className="text-white/50 text-xs">Unfinished goals roll forward to the next day automatically</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            autoCarryTasks ? 'border-brand-orange bg-brand-orange' : 'border-white/30'
          }`}>
            {autoCarryTasks && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </button>

        {/* Bible verse toggle */}
        <button
          onClick={() => setDailyBibleVerse(v => !v)}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
            dailyBibleVerse
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-white/10 bg-white/5'
          }`}
        >
          <span className="text-2xl flex-shrink-0">✝️</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm">Daily Bible Verse</p>
            <p className="text-white/50 text-xs">Show a verse of encouragement each day</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            dailyBibleVerse ? 'border-indigo-400 bg-indigo-400' : 'border-white/30'
          }`}>
            {dailyBibleVerse && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </button>
      </div>

      <div className="pt-4 space-y-3">
        <div className="flex justify-between items-center">
          <StepDots current={6} />
          <button onClick={() => setStep(5)} className="text-white/40 hover:text-white/70 text-sm font-semibold transition-colors px-3 py-2">
            ← Back
          </button>
        </div>
        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full bg-gradient-to-r from-brand-orange to-[#FF4500] text-white font-black text-lg py-4 rounded-2xl shadow-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {starting ? 'Starting…' : `⚡ Start the Season`}
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

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-4 h-2 bg-brand-orange'          // active: pill shape
              : i < current
                ? 'w-2 h-2 bg-white/50'             // completed: solid dim
                : 'w-2 h-2 bg-white/15'             // upcoming: faint
          }`}
        />
      ))}
    </div>
  )
}

function NavRow({
  onNext, onBack, step, showBack = true, isSetup = false,
}: {
  onNext: () => void
  onBack?: () => void
  step: number
  showBack?: boolean
  isSetup?: boolean
}) {
  return (
    <div className="pt-6 flex items-center justify-between">
      <StepDots current={step} />
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
          {isSetup ? 'Next: Goals →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
