'use client'

import { useState } from 'react'

export const MASCOTS = [
  { emoji: '🦅', name: 'Eagles' },
  { emoji: '🐻', name: 'Bears' },
  { emoji: '🦁', name: 'Lions' },
  { emoji: '🐯', name: 'Tigers' },
  { emoji: '🐺', name: 'Wolves' },
  { emoji: '🦈', name: 'Sharks' },
  { emoji: '🔥', name: 'Flames' },
  { emoji: '⚡', name: 'Thunder' },
  { emoji: '💎', name: 'Diamonds' },
  { emoji: '🚀', name: 'Rockets' },
  { emoji: '⚔️', name: 'Warriors' },
  { emoji: '🛡️', name: 'Knights' },
]

interface Props {
  currentTeamName:    string | null
  currentMascot:      string | null
  currentAutoCarry:   boolean
  onSave:             (teamName: string, mascot: string, autoCarry: boolean) => Promise<void>
  onClose:            () => void
}

export default function TeamSettings({ currentTeamName, currentMascot, currentAutoCarry, onSave, onClose }: Props) {
  const [teamName,   setTeamName]   = useState(currentTeamName ?? '')
  const [mascot,     setMascot]     = useState(currentMascot ?? MASCOTS[0].emoji)
  const [autoCarry,  setAutoCarry]  = useState(currentAutoCarry)
  const [saving,     setSaving]     = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(teamName.trim(), mascot, autoCarry)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-black text-brand-navy text-lg mb-4">🏟️ Your Team</h2>

        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
          Team Name
        </label>
        <input
          type="text"
          value={teamName}
          onChange={e => setTeamName(e.target.value)}
          placeholder="e.g. The Thunder Hawks"
          maxLength={30}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-brand-navy mb-5 outline-none focus:border-brand-orange"
        />

        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
          Mascot
        </label>
        <div className="grid grid-cols-6 gap-2 mb-5">
          {MASCOTS.map(m => (
            <button
              key={m.emoji}
              onClick={() => setMascot(m.emoji)}
              title={m.name}
              className={`flex items-center justify-center p-2.5 rounded-xl border-2 transition-all ${
                mascot === m.emoji
                  ? 'border-brand-orange bg-brand-orange/5'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
            </button>
          ))}
        </div>

        {/* Auto-carry toggle */}
        <button
          onClick={() => setAutoCarry(v => !v)}
          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left mb-5 ${
            autoCarry
              ? 'border-brand-orange bg-brand-orange/5'
              : 'border-slate-100 hover:border-slate-200'
          }`}
        >
          <span className="text-xl flex-shrink-0">🔄</span>
          <div className="flex-1 min-w-0">
            <p className="text-brand-navy font-bold text-sm">Auto-carry incomplete tasks</p>
            <p className="text-slate-400 text-xs">Unfinished goals roll to the next day</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            autoCarry ? 'border-brand-orange bg-brand-orange' : 'border-slate-300'
          }`}>
            {autoCarry && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </button>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
