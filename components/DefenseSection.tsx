'use client'

import type { FullInning } from '@/types'
import { countOuts } from '@/lib/game-logic'

interface Props {
  inning:               FullInning
  defaultTasks:         { mind: string; spirit: string; body: string }
  pinchHitterTokens:    number
  onToggle:             (cat: 'mind' | 'spirit' | 'body') => void
  onSaveTask:           (cat: 'mind' | 'spirit' | 'body', val: string) => void
  onSaveDefault:        (cat: 'mind' | 'spirit' | 'body') => void
  onUsePinchHitter:     () => void
}

const CATS = [
  { key: 'mind'   as const, label: 'Mind',   icon: '🧠', color: 'brand-purple', ring: 'focus:ring-purple-300', placeholder: 'Your mental clarity task…' },
  { key: 'spirit' as const, label: 'Spirit', icon: '✨', color: 'brand-yellow', ring: 'focus:ring-yellow-300', placeholder: 'Your spirit & energy task…' },
  { key: 'body'   as const, label: 'Body',   icon: '💪', color: 'brand-teal',   ring: 'focus:ring-teal-300',   placeholder: 'Your physical health task…' },
]

export default function DefenseSection({ inning, defaultTasks, pinchHitterTokens, onToggle, onSaveTask, onSaveDefault, onUsePinchHitter }: Props) {
  const outs = countOuts(inning)
  const canUsePinchHitter = pinchHitterTokens > 0 && outs < 3 && !inning.pinch_hit_used && inning.status !== 'CLOSED'

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 border-brand-purple">
      {/* Header */}
      <div className={`px-5 pt-5 pb-3 flex items-center justify-between transition-colors ${outs === 3 ? 'bg-brand-orange/5' : ''}`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-brand-navy text-base">Defense</h2>
            {outs === 3 && (
              <span className="text-[11px] font-semibold bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full">
                Complete!
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-0.5">Mind · Spirit · Body</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full transition-colors ${
                  i < outs ? 'bg-brand-orange animate-pop' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className={`text-xs font-semibold transition-colors ${outs === 3 ? 'text-brand-orange' : 'text-slate-400'}`}>
            {outs}/3 Outs
          </span>
        </div>
      </div>

      {/* Pinch Hitter token banner */}
      {inning.pinch_hit_used && (
        <div className="mx-5 mb-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
          <span className="text-base">🎽</span>
          <p className="text-amber-800 text-xs font-semibold">Pinch Hitter token used — +1 Out added to today&apos;s defense</p>
        </div>
      )}

      {/* Category rows */}
      <div className={`px-5 space-y-3 ${canUsePinchHitter || inning.pinch_hit_used ? 'pb-3' : 'pb-5'}`}>
        {CATS.map(cat => {
          const completed   = inning[`${cat.key}_completed`]
          const task        = inning[`${cat.key}_task`]
          const isDefault   = task === defaultTasks[cat.key] && task !== ''
          const hasSaveable = task !== '' && !isDefault

          return (
            <div
              key={cat.key}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                completed
                  ? 'bg-brand-orange/5 border-brand-orange/20'
                  : 'bg-slate-50 border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Icon badge */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${
                completed ? 'bg-brand-orange/15' : 'bg-white shadow-sm border border-slate-100'
              }`}>
                {cat.icon}
              </div>

              {/* Task input */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                  {cat.label}
                </div>
                <input
                  type="text"
                  value={task}
                  placeholder={cat.placeholder}
                  onChange={e => onSaveTask(cat.key, e.target.value)}
                  className={`w-full text-sm text-brand-navy placeholder:text-slate-300 bg-transparent outline-none ${
                    completed ? 'line-through text-slate-400' : ''
                  }`}
                />
              </div>

              {/* Pin / save-as-default button */}
              {hasSaveable && (
                <button
                  onClick={() => onSaveDefault(cat.key)}
                  title="Save as my default task"
                  className="flex-shrink-0 text-slate-300 hover:text-brand-orange transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1h1.5A1.5 1.5 0 0 1 13 4v.5a.5.5 0 0 1-.5.5H10v3.17l1.45 1.45a.5.5 0 0 1-.7.7L9.5 8.58 8.25 9.82a.5.5 0 0 1-.7-.7L9 7.67V5H5v2.67L6.45 9.12a.5.5 0 0 1-.7.7L4.5 8.58 3.25 9.82a.5.5 0 0 1-.7-.7L4 7.67V5H3.5a.5.5 0 0 1-.5-.5V4A1.5 1.5 0 0 1 4.5 2.5H6v-1a.5.5 0 0 1 1 0v1h2v-1a.5.5 0 0 1 .5-.5zM7.5 10v4.5a.5.5 0 0 1-1 0V10h1z"/>
                  </svg>
                </button>
              )}
              {isDefault && (
                <span title="This is your saved default" className="flex-shrink-0 text-brand-orange">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1h1.5A1.5 1.5 0 0 1 13 4v.5a.5.5 0 0 1-.5.5H10v3.17l1.45 1.45a.5.5 0 0 1-.7.7L9.5 8.58 8.25 9.82a.5.5 0 0 1-.7-.7L9 7.67V5H5v2.67L6.45 9.12a.5.5 0 0 1-.7.7L4.5 8.58 3.25 9.82a.5.5 0 0 1-.7-.7L4 7.67V5H3.5a.5.5 0 0 1-.5-.5V4A1.5 1.5 0 0 1 4.5 2.5H6v-1a.5.5 0 0 1 1 0v1h2v-1a.5.5 0 0 1 .5-.5zM7.5 10v4.5a.5.5 0 0 1-1 0V10h1z"/>
                  </svg>
                </span>
              )}

              {/* Checkbox */}
              <button
                onClick={() => onToggle(cat.key)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                  completed
                    ? 'bg-brand-green border-brand-green'
                    : 'border-slate-300 hover:border-brand-green'
                }`}
              >
                {completed && (
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Pinch Hitter use button */}
      {canUsePinchHitter && (
        <div className="px-5 pb-5">
          <button
            onClick={onUsePinchHitter}
            className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🎽</span>
              <div className="text-left">
                <p className="text-amber-900 font-black text-sm">Use Pinch Hitter</p>
                <p className="text-amber-700 text-xs">Add +1 Out on a tough day</p>
              </div>
            </div>
            <span className="bg-amber-200 text-amber-900 text-xs font-black px-2.5 py-1 rounded-full">
              {pinchHitterTokens} token{pinchHitterTokens !== 1 ? 's' : ''}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
