'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { NudgePreset } from '@/types'

interface Props {
  teamId:      string
  toUserId:    string
  toName:      string
  onSent:      () => void
  onClose:     () => void
}

const PRESETS: { key: NudgePreset; label: string; emoji: string }[] = [
  { key: 'lets_go',      label: "Let's go!",    emoji: '🔥' },
  { key: 'keep_it_up',   label: 'Keep it up',   emoji: '💪' },
  { key: 'you_got_this', label: 'You got this', emoji: '⚾' },
  { key: 'nice_work',    label: 'Nice work!',   emoji: '🏆' },
]

export default function NudgeModal({ teamId, toUserId, toName, onSent, onClose }: Props) {
  const supabase = createClient()
  const [selected, setSelected] = useState<NudgePreset | null>(null)
  const [custom,   setCustom]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSend() {
    if (!selected) return
    setLoading(true)
    setError(null)

    const { error: insertErr } = await supabase.from('nudges').insert({
      team_id:        teamId,
      from_user_id:   (await supabase.auth.getUser()).data.user!.id,
      to_user_id:     toUserId,
      preset_key:     selected,
      custom_message: custom.trim() || null,
    })

    if (insertErr) {
      setLoading(false)
      setError('Failed to send — please try again.')
      return
    }

    // Fire push notification (best-effort, don't block on it)
    fetch('/api/nudge', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        to_user_id:     toUserId,
        preset_key:     selected,
        custom_message: custom.trim() || null,
      }),
    }).catch(() => {})

    setLoading(false)
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-5">
        <div>
          <h2 className="text-brand-navy font-black text-lg">Nudge {toName}</h2>
          <p className="text-slate-400 text-sm mt-0.5">Send a quick word of encouragement</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setSelected(p.key)}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                selected === p.key
                  ? 'border-brand-orange bg-brand-orange/5 text-brand-orange'
                  : 'border-slate-100 text-slate-600 hover:border-slate-200'
              }`}
            >
              <span className="text-lg leading-none block mb-1">{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>

        {selected && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Add a personal note (optional)
            </label>
            <input
              type="text"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Your message…"
              maxLength={120}
              autoCorrect="off"
              autoCapitalize="sentences"
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-brand-navy text-sm outline-none focus:border-brand-orange transition-colors"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!selected || loading}
            className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending…' : 'Send Nudge 🔥'}
          </button>
        </div>
      </div>
    </div>
  )
}
