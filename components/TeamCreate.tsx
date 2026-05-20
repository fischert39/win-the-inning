'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onCreated: (teamId: string, inviteCode: string, teamName: string) => void
  onCancel:  () => void
}

export default function TeamCreate({ onCreated, onCancel }: Props) {
  const supabase = createClient()
  const [name,     setName]     = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('create_team', {
      p_name:      name.trim(),
      p_is_public: isPublic,
    })
    setLoading(false)
    if (rpcErr || data?.error) {
      const msg = data?.error === 'already_on_team'
        ? "You're already on a team. Leave it first before creating a new one."
        : 'Something went wrong — please try again.'
      setError(msg)
      return
    }
    onCreated(data.team_id, data.invite_code, name.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5">
        <div>
          <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1">👥 New Team</p>
          <h2 className="text-brand-navy font-black text-xl">Build Your Crew</h2>
          <p className="text-slate-400 text-sm mt-0.5">Hold each other accountable. Win together.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Team Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. The Morning Crew"
              autoFocus
              autoCorrect="off"
              autoCapitalize="words"
              maxLength={40}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-brand-navy text-sm outline-none focus:border-brand-orange transition-colors"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-brand-orange transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-navy">Discoverable via search</p>
              <p className="text-xs text-slate-400 mt-0.5">Others can find your team by name and request to join. Leave off for invite-only.</p>
            </div>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating…' : '🚀 Create Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
