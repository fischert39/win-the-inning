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
  currentTeamName: string | null
  currentMascot:   string | null
  onSave:          (teamName: string, mascot: string) => Promise<void>
  onClose:         () => void
}

export default function TeamSettings({ currentTeamName, currentMascot, onSave, onClose }: Props) {
  const [teamName, setTeamName] = useState(currentTeamName ?? '')
  const [mascot,   setMascot]   = useState(currentMascot ?? MASCOTS[0].emoji)
  const [saving,   setSaving]   = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(teamName.trim(), mascot)
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
        <div className="grid grid-cols-4 gap-2 mb-6">
          {MASCOTS.map(m => (
            <button
              key={m.emoji}
              onClick={() => setMascot(m.emoji)}
              className={`flex flex-col items-center py-2.5 px-1 rounded-xl border-2 transition-all ${
                mascot === m.emoji
                  ? 'border-brand-orange bg-brand-orange/5'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <span className="text-2xl leading-none">{m.emoji}</span>
              <span className="text-[9px] text-slate-500 mt-1 font-semibold leading-none">{m.name}</span>
            </button>
          ))}
        </div>

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
            {saving ? 'Saving…' : 'Save Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
