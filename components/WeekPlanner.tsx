'use client'

import { useState } from 'react'
import type { HitType } from '@/types'
import { getWeekDates, getWeekStart, displayDate, today } from '@/lib/game-logic'
import { GOAL_PRESETS } from '@/lib/presets'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DAY_FULL   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ALL_DAYS   = () => [true, true, true, true, true, true, true]

const HIT_PICKER: { key: HitType; label: string; cls: string }[] = [
  { key: 'single', label: '1B', cls: 'bg-sky-100 text-sky-700 ring-sky-400'         },
  { key: 'double', label: '2B', cls: 'bg-teal-100 text-teal-700 ring-teal-400'      },
  { key: 'triple', label: '3B', cls: 'bg-purple-100 text-purple-700 ring-purple-400'},
  { key: 'homer',  label: 'HR', cls: 'bg-brand-orange text-white ring-brand-orange' },
]

export type DefenseCat = 'mind' | 'spirit' | 'body'

const DEFENSE_CATS: { key: DefenseCat; icon: string; label: string; ph: string }[] = [
  { key: 'mind',   icon: '🧠', label: 'Mind',   ph: 'Your mental clarity task…'   },
  { key: 'spirit', icon: '✨', label: 'Spirit', ph: 'Your spirit & energy task…'  },
  { key: 'body',   icon: '💪', label: 'Body',   ph: 'Your physical health task…'  },
]

export interface DefenseTask {
  key:  string             // local-only React key
  text: string
  days: boolean[]          // 7 entries, Mon → Sun
}

export interface PlannedGoal {
  key:     string          // local-only React key
  text:    string
  hitType: HitType
  days:    boolean[]       // 7 entries, Mon → Sun
}

export interface WeekPlan {
  defense: Record<DefenseCat, DefenseTask[]>
  goals:   PlannedGoal[]
}

interface Props {
  weekStart:  string
  sportEmoji: string
  defaults:   { mind: string; spirit: string; body: string }
  templates:  string[]
  /** Dates in this week that are already closed — planning skips them. */
  lockedDates: string[]
  onSave:     (plan: WeekPlan) => Promise<void>
  onClose:    () => void
}

let uid = 0
function nextKey(p: string) { uid += 1; return p + uid }

function newGoal(text = ''): PlannedGoal {
  return { key: nextKey('pg_'), text, hitType: 'single', days: ALL_DAYS() }
}
function newTask(text = '', days = ALL_DAYS()): DefenseTask {
  return { key: nextKey('dt_'), text, days: [...days] }
}

export default function WeekPlanner({
  weekStart, sportEmoji, defaults, templates, lockedDates, onSave, onClose,
}: Props) {
  const dates      = getWeekDates(weekStart)
  const isNextWeek = weekStart > getWeekStart(today())

  const [defense, setDefense] = useState<Record<DefenseCat, DefenseTask[]>>({
    mind:   [newTask(defaults.mind)],
    spirit: [newTask(defaults.spirit)],
    body:   [newTask(defaults.body)],
  })
  const [goals,  setGoals]  = useState<PlannedGoal[]>([newGoal()])
  const [showPresets, setShowPresets] = useState(false)
  const [saving, setSaving] = useState(false)

  const lockedSet   = new Set(lockedDates)
  const lockedCount = dates.filter(d => lockedSet.has(d)).length

  // ── Defense mutations ──────────────────────────────────────────────────────
  function patchTask(cat: DefenseCat, key: string, text: string) {
    setDefense(p => ({ ...p, [cat]: p[cat].map(t => t.key === key ? { ...t, text } : t) }))
  }
  // A day has exactly one slot per category, so turning a day on for one task
  // turns it off for every other task in that same category.
  function toggleTaskDay(cat: DefenseCat, key: string, idx: number) {
    setDefense(p => {
      const turningOn = !p[cat].find(t => t.key === key)?.days[idx]
      return {
        ...p,
        [cat]: p[cat].map(t => {
          if (t.key === key) return { ...t, days: t.days.map((v, i) => i === idx ? turningOn : v) }
          if (turningOn)     return { ...t, days: t.days.map((v, i) => i === idx ? false : v) }
          return t
        }),
      }
    })
  }
  function addTask(cat: DefenseCat) {
    // New rows start empty — the user picks which days to pull across.
    setDefense(p => ({ ...p, [cat]: [...p[cat], newTask('', [false,false,false,false,false,false,false])] }))
  }
  function removeTask(cat: DefenseCat, key: string) {
    setDefense(p => ({
      ...p,
      [cat]: p[cat].length === 1 ? [newTask()] : p[cat].filter(t => t.key !== key),
    }))
  }

  // ── Offense mutations ──────────────────────────────────────────────────────
  function patch(key: string, updates: Partial<PlannedGoal>) {
    setGoals(prev => prev.map(g => g.key === key ? { ...g, ...updates } : g))
  }
  function toggleDay(key: string, idx: number) {
    setGoals(prev => prev.map(g =>
      g.key === key ? { ...g, days: g.days.map((v, i) => i === idx ? !v : v) } : g))
  }
  function setAllDays(key: string, val: boolean) {
    setGoals(prev => prev.map(g => g.key === key ? { ...g, days: g.days.map(() => val) } : g))
  }
  function addGoal(text = '') { setGoals(prev => [...prev, newGoal(text)]) }
  function removeGoal(key: string) {
    setGoals(prev => prev.length === 1 ? [newGoal()] : prev.filter(g => g.key !== key))
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filled    = goals.filter(g => g.text.trim() && g.days.some(Boolean))
  const totalHits = filled.reduce((n, g) => n + g.days.filter(Boolean).length, 0)

  const cleanDefense = (cat: DefenseCat) =>
    defense[cat].filter(t => t.text.trim() && t.days.some(Boolean))

  const totalOuts = DEFENSE_CATS.reduce((n, c) =>
    n + cleanDefense(c.key).reduce((m, t) => m + t.days.filter(Boolean).length, 0), 0)

  /** Days in this category with no task assigned (and not already locked). */
  function uncoveredDays(cat: DefenseCat): string[] {
    const covered = new Array(7).fill(false)
    for (const t of cleanDefense(cat)) t.days.forEach((v, i) => { if (v) covered[i] = true })
    return DAY_FULL.filter((_, i) => !covered[i] && !lockedSet.has(dates[i]))
  }

  const canSave = totalOuts > 0 || filled.length > 0

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    await onSave({
      defense: {
        mind:   cleanDefense('mind').map(t   => ({ ...t, text: t.text.trim() })),
        spirit: cleanDefense('spirit').map(t => ({ ...t, text: t.text.trim() })),
        body:   cleanDefense('body').map(t   => ({ ...t, text: t.text.trim() })),
      },
      goals: filled.map(g => ({ ...g, text: g.text.trim() })),
    })
  }

  // ── Shared day-toggle row ──────────────────────────────────────────────────
  function DayRow({ days, onToggle, trailing }: {
    days: boolean[]
    onToggle: (idx: number) => void
    trailing?: React.ReactNode
  }) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide w-8">Days</span>
        {DAY_LABELS.map((lbl, i) => {
          const locked = lockedSet.has(dates[i])
          const on     = days[i] && !locked
          return (
            <button
              key={i}
              onClick={() => { if (!locked) onToggle(i) }}
              disabled={locked}
              title={locked ? 'This day is already finished' : dates[i]}
              aria-pressed={on}
              className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all active:scale-90 ${
                locked
                  ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  : on
                    ? 'bg-brand-orange text-white shadow-sm shadow-brand-orange/40'
                    : 'bg-white text-slate-400 ring-1 ring-slate-100 hover:text-slate-600'
              }`}
            >
              {lbl}
            </button>
          )
        })}
        {trailing}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto">

      {/* ── Header ── */}
      <div className="bg-brand-navy sticky top-0 z-10 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">
              {sportEmoji} Lineup Card
            </p>
            <h1 className="text-white font-black text-xl leading-tight">
              Plan {isNextWeek ? 'Next' : 'This'} Week&apos;s Game
            </h1>
            <p className="text-white/50 text-xs mt-0.5">
              {displayDate(dates[0])} — {displayDate(dates[6])}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close planner"
            className="text-white/40 hover:text-white text-2xl leading-none flex-shrink-0 -mt-1"
          >
            ×
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-32 space-y-5">

        {lockedCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg leading-none">⏳</span>
            <p className="text-amber-800 text-xs leading-snug">
              <strong className="font-bold">{lockedCount} day{lockedCount !== 1 ? 's' : ''} already finished.</strong>{' '}
              Those innings won&apos;t be changed — planning applies to the days still ahead.
            </p>
          </div>
        )}

        {/* ── Defense ── */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 border-brand-purple">
          <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">
              Defense · Your Outs
            </span>
            <span className="text-brand-orange text-[10px] font-black tabular-nums">
              {totalOuts} scheduled
            </span>
          </div>

          <div className="px-5 py-4 space-y-4">
            <p className="text-slate-400 text-xs -mt-1">
              Three outs a day — one each from Mind, Spirit and Body. Add more than one
              task per category to vary it across the week.
            </p>

            {DEFENSE_CATS.map(cat => {
              const uncovered = uncoveredDays(cat.key)
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base leading-none">{cat.icon}</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                      {cat.label}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {defense[cat.key].map(t => (
                      <div key={t.key} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
                          <input
                            type="text"
                            value={t.text}
                            onChange={e => patchTask(cat.key, t.key, e.target.value)}
                            placeholder={cat.ph}
                            autoCorrect="off"
                            autoCapitalize="sentences"
                            className="flex-1 text-sm text-brand-navy bg-transparent outline-none placeholder:text-slate-300"
                          />
                          <button
                            onClick={() => removeTask(cat.key, t.key)}
                            aria-label={`Remove ${cat.label} task`}
                            className="text-slate-300 hover:text-brand-red text-lg leading-none transition-colors"
                          >
                            ×
                          </button>
                        </div>
                        <div className="px-3 pb-3">
                          <DayRow
                            days={t.days}
                            onToggle={i => toggleTaskDay(cat.key, t.key, i)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-1.5">
                    <button
                      onClick={() => addTask(cat.key)}
                      className="text-[11px] font-bold text-slate-400 hover:text-brand-orange transition-colors"
                    >
                      + Different {cat.label.toLowerCase()} task on some days
                    </button>
                    {uncovered.length > 0 && uncovered.length < 7 && (
                      <span className="text-[10px] text-amber-600 font-semibold">
                        No task: {uncovered.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Offense ── */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 border-brand-orange">
          <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">
              Offense · Your Hits
            </span>
            <span className="text-brand-orange text-[10px] font-black tabular-nums">
              {totalHits} scheduled
            </span>
          </div>

          <div className="px-5 py-4 space-y-3">
            <p className="text-slate-400 text-xs -mt-1">
              Add a goal once, then pick the days it lands on.
            </p>

            {goals.map(g => (
              <div key={g.key} className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
                  <span className="text-base flex-shrink-0">{sportEmoji}</span>
                  <input
                    type="text"
                    value={g.text}
                    onChange={e => patch(g.key, { text: e.target.value })}
                    placeholder="What's your goal?"
                    autoCorrect="off"
                    autoCapitalize="sentences"
                    className="flex-1 text-sm text-brand-navy bg-transparent outline-none placeholder:text-slate-300"
                  />
                  <button
                    onClick={() => removeGoal(g.key)}
                    aria-label="Remove goal"
                    className="text-slate-300 hover:text-brand-red text-lg leading-none transition-colors"
                  >
                    ×
                  </button>
                </div>

                <div className="flex items-center gap-1.5 px-3 pb-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide w-8">Hit</span>
                  {HIT_PICKER.map(h => (
                    <button
                      key={h.key}
                      onClick={() => patch(g.key, { hitType: h.key })}
                      aria-pressed={g.hitType === h.key}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black ring-1 transition-all active:scale-95 ${
                        g.hitType === h.key
                          ? h.cls
                          : 'bg-white text-slate-400 ring-slate-100 hover:text-slate-600'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>

                <div className="px-3 pb-3">
                  <DayRow
                    days={g.days}
                    onToggle={i => toggleDay(g.key, i)}
                    trailing={
                      <button
                        onClick={() => setAllDays(g.key, !g.days.every(Boolean))}
                        className="ml-auto text-[10px] font-bold text-slate-400 hover:text-brand-orange transition-colors"
                      >
                        {g.days.every(Boolean) ? 'None' : 'All'}
                      </button>
                    }
                  />
                </div>
              </div>
            ))}

            <button
              onClick={() => addGoal()}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-200 hover:border-brand-orange text-slate-500 hover:text-brand-orange rounded-xl py-2.5 text-sm font-semibold transition-all"
            >
              + Add another goal
            </button>

            {templates.length > 0 && (
              <button
                onClick={() => templates.forEach(t => addGoal(t))}
                className="w-full rounded-xl py-2 text-xs font-bold border bg-white border-slate-200 text-slate-500 hover:text-brand-orange hover:border-brand-orange/30 transition-all"
              >
                📋 Load my templates ({templates.length} goals)
              </button>
            )}

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowPresets(v => !v)}
                aria-expanded={showPresets}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-semibold text-slate-500">⚡ Goal Presets</span>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showPresets ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              {showPresets && (
                <div className="px-3.5 pb-3 space-y-3">
                  {GOAL_PRESETS.map(c => (
                    <div key={c.category}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        {c.category}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.goals.map(text => (
                          <button
                            key={text}
                            onClick={() => addGoal(text)}
                            className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 font-semibold hover:border-brand-orange hover:text-brand-orange active:scale-95 transition-all"
                          >
                            + {text}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Sticky save bar ── */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 px-4 py-3 safe-area-pb">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3.5 rounded-xl text-slate-400 font-semibold text-sm hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={`flex-1 py-3.5 rounded-xl font-black text-sm tracking-widest uppercase transition-all text-white active:scale-[0.98] ${
              canSave && !saving
                ? 'bg-brand-orange hover:bg-brand-orange-dark shadow-md shadow-brand-orange/30'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? 'Setting lineup…' : '📋 Set the Lineup'}
          </button>
        </div>
      </div>
    </div>
  )
}
