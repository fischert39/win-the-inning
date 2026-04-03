'use client'

import type { FullInning } from '@/types'
import { countOuts } from '@/lib/game-logic'

interface Props {
  inning:      FullInning
  onToggle:    (cat: 'mind' | 'spirit' | 'body') => void
  onSaveTask:  (cat: 'mind' | 'spirit' | 'body', val: string) => void
}

const CATS = [
  { key: 'mind'   as const, label: 'Mind',   icon: '🧠', color: 'brand-purple', ring: 'focus:ring-purple-300', placeholder: 'Your mental clarity task…' },
  { key: 'spirit' as const, label: 'Spirit', icon: '✨', color: 'brand-yellow', ring: 'focus:ring-yellow-300', placeholder: 'Your spirit & energy task…' },
  { key: 'body'   as const, label: 'Body',   icon: '💪', color: 'brand-teal',   ring: 'focus:ring-teal-300',   placeholder: 'Your physical health task…' },
]

export default function DefenseSection({ inning, onToggle, onSaveTask }: Props) {
  const outs   = countOuts(inning)
  const closed = inning.status === 'CLOSED'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className={`px-5 pt-5 pb-3 flex items-center justify-between transition-colors ${outs === 3 ? 'bg-green-50' : ''}`}>
        <div>
          <h2 className={`font-black text-base transition-colors ${outs === 3 ? 'text-brand-green' : 'text-brand-navy'}`}>
            🛡️ Defense — {outs === 3 ? '3 Outs! Great job!' : 'Get 3 Outs'}
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">Complete your Mind, Spirit &amp; Body tasks</p>
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
          <span className={`text-xs font-bold transition-colors ${outs === 3 ? 'text-brand-green' : 'text-slate-500'}`}>
            {outs}/3 Outs
          </span>
        </div>
      </div>

      {/* Category rows */}
      <div className="px-5 pb-5 space-y-3">
        {CATS.map(cat => {
          const completed = inning[`${cat.key}_completed`]
          const task      = inning[`${cat.key}_task`]

          return (
            <div
              key={cat.key}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                completed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-slate-50 border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Icon badge */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${
                completed ? 'bg-brand-green/20' : 'bg-white shadow-sm border border-slate-100'
              }`}>
                {cat.icon}
              </div>

              {/* Task input */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
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
    </div>
  )
}
