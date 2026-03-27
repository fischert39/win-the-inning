'use client'

import type { SeasonGoal } from '@/types'

interface Props {
  goals:    SeasonGoal[]
  onAdd:    () => void
  onSave:   (id: string, text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function SeasonGoals({ goals, onAdd, onSave, onToggle, onDelete }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div>
          <h2 className="text-brand-navy font-black text-base">🏆 Season Goals</h2>
          <p className="text-slate-400 text-xs mt-0.5">What does a winning season look like for you?</p>
        </div>
        <button
          onClick={onAdd}
          className="text-brand-orange text-sm font-bold hover:text-brand-orange-dark transition-colors mt-0.5"
        >
          + Add
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="px-5 pb-5 text-slate-300 text-sm text-center py-4">
          No season goals yet — add one above!
        </div>
      ) : (
        <div className="px-5 pb-5 space-y-2">
          {goals.map(goal => (
            <div
              key={goal.id}
              className={`flex items-center gap-3 group ${goal.completed ? 'opacity-60' : ''}`}
            >
              {/* Checkbox */}
              <button
                onClick={() => onToggle(goal.id)}
                className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  goal.completed
                    ? 'bg-brand-green border-brand-green'
                    : 'border-slate-300 hover:border-brand-green'
                }`}
              >
                {goal.completed && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>

              {/* Input */}
              <input
                type="text"
                value={goal.text}
                placeholder="What does a winning season look like?"
                onChange={e => onSave(goal.id, e.target.value)}
                className={`flex-1 text-sm text-brand-navy placeholder:text-slate-300 bg-transparent border-b border-transparent focus:border-brand-orange transition-colors py-0.5 ${
                  goal.completed ? 'line-through text-slate-400' : ''
                }`}
              />

              {/* Delete */}
              <button
                onClick={() => onDelete(goal.id)}
                className="text-slate-200 hover:text-brand-red transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
