'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TeamSearchResult } from '@/types'

interface Props {
  onJoined:  (teamId: string, teamName: string) => void
  onPending: (teamName: string) => void
  onCancel:  () => void
}

export default function TeamJoin({ onJoined, onPending, onCancel }: Props) {
  const supabase = createClient()
  const [mode,    setMode]    = useState<'code' | 'search'>('code')
  const [code,    setCode]    = useState('')
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<TeamSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleJoinByCode() {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('join_team_by_code', { p_code: code.trim() })
    setLoading(false)
    if (rpcErr || data?.error) {
      const msgs: Record<string, string> = {
        invalid_code:   'That code is invalid. Double-check and try again.',
        team_full:      'This team is full (max 10 members).',
        already_on_team: "You're already on a team. Leave it first.",
      }
      setError(msgs[data?.error] ?? 'Something went wrong — please try again.')
      return
    }
    onJoined(data.team_id, data.team_name)
  }

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    const { data } = await supabase.rpc('search_teams', { p_query: query.trim() })
    setLoading(false)
    setResults((data as TeamSearchResult[]) ?? [])
  }

  async function handleRequest(team: TeamSearchResult) {
    setLoading(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('request_join_team', { p_team_id: team.id })
    setLoading(false)
    if (rpcErr || data?.error) {
      const msgs: Record<string, string> = {
        team_full:       'This team is full (max 10 members).',
        already_on_team: "You're already on a team.",
        not_public:      'This team is invite-only.',
      }
      setError(msgs[data?.error] ?? 'Something went wrong — please try again.')
      return
    }
    onPending(team.name)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5">
        <div>
          <h2 className="text-brand-navy font-black text-xl">Join a Team</h2>
          <p className="text-slate-400 text-sm mt-0.5">Find your crew</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {(['code', 'search'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null) }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === m ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-400'
              }`}
            >
              {m === 'code' ? '🔑 Invite Code' : '🔍 Search'}
            </button>
          ))}
        </div>

        {mode === 'code' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                6-Character Code
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
                placeholder="ABC123"
                autoFocus
                autoCorrect="off"
                autoCapitalize="characters"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-brand-navy text-sm font-mono tracking-widest text-center outline-none focus:border-brand-orange transition-colors uppercase"
              />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinByCode}
                disabled={code.length < 4 || loading}
                className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining…' : 'Join Team'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search team name…"
                autoCorrect="off"
                autoCapitalize="words"
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-brand-navy text-sm outline-none focus:border-brand-orange transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim() || loading}
                className="px-4 py-3 rounded-xl bg-brand-navy text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-40"
              >
                {loading ? '…' : 'Go'}
              </button>
            </div>

            {results.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {results.map(team => (
                  <div key={team.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-bold text-sm text-brand-navy">{team.name}</p>
                      <p className="text-xs text-slate-400">
                        {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                        {team.creator_name ? ` · by ${team.creator_name}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRequest(team)}
                      disabled={loading}
                      className="ml-3 text-xs font-bold text-brand-orange hover:underline disabled:opacity-50 flex-shrink-0"
                    >
                      Request
                    </button>
                  </div>
                ))}
              </div>
            )}

            {results.length === 0 && query && !loading && (
              <p className="text-sm text-slate-400 text-center py-2">No public teams found.</p>
            )}

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}

            <button
              onClick={onCancel}
              className="w-full py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
