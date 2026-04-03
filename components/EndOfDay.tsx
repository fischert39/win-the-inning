'use client'

import type { FullInning } from '@/types'

interface Props {
  inning:              FullInning
  onSaveReflection:    (val: string) => void
  onSaveFutureGoals:   (val: string) => void
}

export default function EndOfDay({ inning, onSaveReflection, onSaveFutureGoals }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-brand-navy font-black text-base">📝 End of Inning</h2>
        <p className="text-slate-400 text-xs mt-0.5">Reflect on today and set your vision for tomorrow</p>
      </div>

      <div className="px-5 pb-5 grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Today&apos;s Reflection
          </label>
          <textarea
            rows={4}
            value={inning.reflection}
            onChange={e => onSaveReflection(e.target.value)}
            placeholder="How did today go? What did you learn? What are you grateful for?"
            className="w-full text-sm text-brand-navy placeholder:text-slate-300 bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:border-brand-orange focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Goals for Tomorrow
          </label>
          <textarea
            rows={4}
            value={inning.future_goals}
            onChange={e => onSaveFutureGoals(e.target.value)}
            placeholder="What do you want to accomplish tomorrow?"
            className="w-full text-sm text-brand-navy placeholder:text-slate-300 bg-slate-50 border border-slate-100 rounded-xl p-3 outline-none focus:border-brand-orange focus:bg-white transition-all"
          />
        </div>
      </div>
    </div>
  )
}
