'use client'

import { useState } from 'react'
import type { Achievement } from '@/lib/achievements'

interface Props {
  achievements: Achievement[]
}

export default function Achievements({ achievements }: Props) {
  const [open, setOpen] = useState(false)
  const unlocked = achievements.filter(a => a.unlocked).length

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🏅</span>
          <div className="text-left">
            <h2 className="font-black text-base text-brand-navy">Achievements</h2>
            <p className="text-slate-400 text-xs mt-0.5">{unlocked}/{achievements.length} unlocked</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-orange rounded-full transition-all duration-500"
              style={{ width: `${(unlocked / achievements.length) * 100}%` }}
            />
          </div>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 grid grid-cols-2 gap-2">
          {achievements.map(a => (
            <div
              key={a.id}
              className={`rounded-xl p-3 border transition-all ${
                a.unlocked
                  ? 'bg-brand-orange/5 border-brand-orange/20'
                  : 'bg-slate-50 border-slate-100 opacity-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
                {a.unlocked && (
                  <span className="text-[10px] font-black text-brand-orange uppercase tracking-wider">Unlocked</span>
                )}
              </div>
              <p className={`text-sm font-black ${a.unlocked ? 'text-brand-navy' : 'text-slate-400'}`}>
                {a.name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
