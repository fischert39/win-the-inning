'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  username:     string
  display_name: string | null
  mascot:       string | null
  team_name:    string | null
  sport:        string
}

interface Props {
  isDiscoverable: boolean
  onOpenSettings: () => void
}

export default function FindFriends({ isDiscoverable, onOpenSettings }: Props) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(false)
  const supabase = createClient()

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setSearched(true)
    const { data } = await supabase.rpc('search_users', { p_query: q })
    setResults(data ?? [])
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <h2 className="font-black text-brand-navy text-base mb-0.5">🔍 Find Players</h2>
        <p className="text-slate-400 text-xs mb-4">Search by name, username, or email</p>

        {!isDiscoverable && (
          <button
            onClick={onOpenSettings}
            className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-left"
          >
            <p className="text-amber-800 text-xs font-semibold">
              💡 You're not discoverable — others can't find you yet.{' '}
              <span className="underline">Enable in Team Settings →</span>
            </p>
          </button>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Name, @username, or email…"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="bg-brand-orange text-white font-black text-sm px-5 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? '…' : 'Go'}
          </button>
        </div>
      </div>

      {searched && (
        <div className="border-t border-slate-100">
          {results.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-6 px-5">
              No players found. Try a different name or ask them to enable discoverability.
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {results.map(r => (
                <div key={r.username} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="text-2xl flex-shrink-0">
                    {r.mascot ?? (r.sport === 'baseball' ? '⚾' : '🥎')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-brand-navy truncate">
                      {r.display_name ?? r.username}
                    </p>
                    <p className="text-slate-400 text-xs truncate">
                      @{r.username}{r.team_name ? ` · ${r.team_name}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/u/${r.username}`}
                    target="_blank"
                    className="text-xs text-brand-orange font-black hover:underline flex-shrink-0 px-3 py-1.5 bg-brand-orange/5 rounded-lg"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
