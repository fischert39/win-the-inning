'use client'

import { useState } from 'react'
import type { HitType } from '@/types'
import { getWeekDates, displayDate } from '@/lib/game-logic'
import { GOAL_PRESETS } from '@/lib/presets'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const HIT_PICKER: { key: HitType; label: string; cls: string }[] = [
  { key: 'single', label: '1B', cls: 'bg-sky-100 text-sky-700 ring-sky-400'         },
  { key: 'double', label: '2B', cls: 'bg-teal-100 text-teal-700 ring-teal-400'      },
  { key: 'triple', label: '3B', cls: 'bg-purple-100 text-purple-700 ring-purple-400'},
  { key: 'homer',  label: 'HR', cls: 'bg-brand-orange text-white ring-brand-orange' },
]

export interface PlannedGoal {
  key:     string          // local-only React key
  text:    string
  hitType: HitType
  days:    boolean[]       // 7 entries, Mon → Sun
}

export interface WeekPlan {
  defense: { mind: string; spirit: string; body: string }
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
function newGoal(text = '', days = [true, true, true, true, true, true, true]): PlannedGoal {
  uid += 1
  return { key: 'pg_' + uid, text, hitType: 'single', days: [...days] }
}

export default function WeekPlanner({
  weekStart, sportEmoji, defaults, templates, lockedDates, onSave, onClose,
}: Props) {
  const dates = getWeekDates(weekStart)

  const [mind,   setMind]   = useState(defaults.mind)
  const [spirit, setSpirit] = useState(defaults.spirit)
  const [body,   setBody]   = useState(defaults.body)
  const [goals,  setGoals]  = useState<PlannedGoal[]>([newGoal()])
  const [showPresets, setShowPresets] = useState(false)
  const [saving, setSaving] = useState(false)

  const lockedSet   = new Set(lockedDates)
  const lockedCount = dates.filter(d => lockedSet.has(d)).length

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
  function addGoal(text = '') {
    setGoals(prev => [...prev, newGoal(text)])
  }
  function removeGoal(key: string) {
    setGoals(prev => prev.length === 1 ? [newGoal()] : prev.filter(g => g.key !== key))
  }

  const filled     = goals.filter(g => g.text.trim() && g.days.some(Boolean))
  const totalHits  = filled.reduce((n, g) => n + g.days.filter(Boolean).length, 0)
  const hasDefense = !!(mind.trim() || spirit.trim() || body.trim())
  const canSave    = hasDefense || filled.length > 0

  async function handleSave() {
    if (!canSave || saving) return
    setSaving(true)
    await onSave({
      defense: { mind: mind.trim(), spirit: spirit.trim(), body: body.trim() },
      goals:   filled.map(g => ({ ...g, text: g.text.trim() })),
    })
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
            <h1 className="text-white font-black text-xl leading-tight">Plan Your Week</h1>
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
              Defense · Your 3 Outs
            </span>
            <span className="text-white/30 text-[10px] font-semibold">every day</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <p className="text-slate-400 text-xs -mt-1 mb-1">
              These three repeat all week. Change any single day later from that day&apos;s view.
            </p>
            {([
              { icon: '🧠', label: 'Mind',   val: mind,   set: setMind,   ph: 'Your mental clarity task…' },
              { icon: '✨', label: 'Spirit', val: spirit, set: setSpirit, ph: 'Your spirit & energy task…' },
              { icon: '💪', label: 'Body',   val: body,   set: setBody,   ph: 'Your physical health task…' },
            ]).map(row => (
              <div key={row.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-lg flex-shrink-0 w-6 text-center">{row.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-0.5">
                    {row.label}
                  </p>
                  <input
                    type="text"
                    value={row.val}
                    onChange={e => row.set(e.target.value)}
                    placeholder={row.ph}
                    autoCorrect="off"
                    autoCapitalize="sentences"
                    className="w-full text-sm text-brand-navy bg-transparent outline-none placeholder:text-slate-300"
                  />
                </div>
              </div>
            ))}
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
                {/* Text */}
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

                {/* Hit type */}
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

                {/* Days */}
                <div className="flex items-center gap-1.5 px-3 pb-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide w-8">Days</span>
                  {DAY_LABELS.map((lbl, i) => {
                    const locked = lockedSet.has(dates[i])
                    const on     = g.days[i] && !locked
                    return (
                      <button
                        key={i}
                        onClick={() => { if (!locked) toggleDay(g.key, i) }}
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
                  <button
                    onClick={() => setAllDays(g.key, !g.days.every(Boolean))}
                    className="ml-auto text-[10px] font-bold text-slate-400 hover:text-brand-orange transition-colors"
                  >
                    {g.days.every(Boolean) ? 'None' : 'All'}
                  </button>
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

            {/* Presets */}
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
                  {GOAL_PRESETS.map(cat => (
                    <div key={cat.category}>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        {cat.category}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.goals.map(text => (
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
