'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  TEAM_ACHIEVEMENT_DEFS,
  getTeamAchievementDef,
  type TeamAchievementCategory,
} from '@/lib/achievements'
import type { TeamAchievement } from '@/types'

const CATEGORIES: { key: TeamAchievementCategory; label: string; icon: string }[] = [
  { key: 'teamwork',  label: 'Teamwork',   icon: '🤝' },
  { key: 'streak',    label: 'Streaks',    icon: '🔥' },
  { key: 'milestone', label: 'Milestones', icon: '💯' },
]

interface EnrichedAchievement {
  keyPrefix:   string
  icon:        string
  name:        string
  description: string
  category:    TeamAchievementCategory
  unlocked:    boolean
  unlockedAt:  string | null
  count:       number   // how many times earned (e.g. Full Squad Win: 5 times)
}

export default function TeamAchievements() {
  const supabase  = createClient()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(true)
  const [team,    setTeam]    = useState<{ name: string } | null>(null)
  const [items,   setItems]   = useState<EnrichedAchievement[]>([])

  useEffect(() => {
    async function load() {
      const { data: teamData } = await supabase.rpc('get_my_team')
      if (!teamData) { setLoading(false); return }

      setTeam({ name: teamData.name })

      // Build enriched list: all defined achievements, mark which are unlocked
      const dbAchs: TeamAchievement[] = teamData.achievements ?? []

      // Count how many times each achievement has been earned
      const countByPrefix = new Map<string, { count: number; latestAt: string }>()
      for (const a of dbAchs) {
        const def = getTeamAchievementDef(a.key)
        if (!def) continue
        const existing = countByPrefix.get(def.keyPrefix)
        if (!existing || a.achieved_at > existing.latestAt) {
          countByPrefix.set(def.keyPrefix, {
            count:    (existing?.count ?? 0) + 1,
            latestAt: a.achieved_at,
          })
        } else {
          countByPrefix.set(def.keyPrefix, {
            ...existing,
            count: existing.count + 1,
          })
        }
      }

      const enriched: EnrichedAchievement[] = TEAM_ACHIEVEMENT_DEFS.map(def => {
        const entry = countByPrefix.get(def.keyPrefix)
        return {
          ...def,
          unlocked:   !!entry,
          unlockedAt: entry?.latestAt ?? null,
          count:      entry?.count ?? 0,
        }
      })

      setItems(enriched)
      setLoading(false)
    }
    load()
  }, [supabase])

  // Don't render if no team
  if (!loading && !team) return null

  const unlocked = items.filter(a => a.unlocked).length
  const total    = items.length

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🏅</span>
          <div className="text-left">
            <h2 className="font-black text-base text-brand-navy">Team Achievements</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {loading ? 'Loading…' : `${unlocked}/${total} unlocked${team ? ` · ${team.name}` : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-orange rounded-full transition-all duration-500"
                style={{ width: total > 0 ? `${(unlocked / total) * 100}%` : '0%' }}
              />
            </div>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16" fill="none"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
            </div>
          ) : (
            CATEGORIES.map(cat => {
              const catItems = items.filter(a => a.category === cat.key)
              const catUnlocked = catItems.filter(a => a.unlocked).length
              return (
                <div key={cat.key}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{cat.icon}</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {cat.label}
                    </p>
                    <span className="text-[10px] text-slate-300 ml-auto">
                      {catUnlocked}/{catItems.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {catItems.map(a => (
                      <div
                        key={a.keyPrefix}
                        className={`rounded-xl p-3 border transition-all ${
                          a.unlocked
                            ? 'bg-brand-orange/5 border-brand-orange/20'
                            : 'bg-slate-50 border-slate-100 opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
                          {a.unlocked && (
                            <span className="text-[10px] font-black text-brand-orange uppercase tracking-wider">
                              {a.count > 1 ? `×${a.count}` : 'Unlocked'}
                            </span>
                          )}
                        </div>
                        <p className={`text-sm font-black ${a.unlocked ? 'text-brand-navy' : 'text-slate-400'}`}>
                          {a.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {a.description}
                        </p>
                        {a.unlocked && a.unlockedAt && (
                          <p className="text-[10px] text-slate-300 mt-1">
                            {new Date(a.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
