'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FeedItem {
  display_name: string | null
  team_name:    string | null
  mascot:       string | null
  closed_at:    string
  streak:       number
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hrs  = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 60)  return `${mins}m ago`
  if (hrs  < 24)  return `${hrs}h ago`
  return `${days}d ago`
}

export default function ActivityFeed() {
  const [items,   setItems]   = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.rpc('get_activity_feed', { limit_count: 15 }).then(({ data }) => {
      setItems((data as FeedItem[]) ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-2xl mb-2">👀</p>
        <p className="text-sm font-medium">No public activity in the last 72 hours.</p>
        <p className="text-xs mt-1">Enable discoverability in settings to appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const name   = item.team_name ?? item.display_name ?? 'Someone'
        const mascot = item.mascot ?? '⚾'
        const msg    = item.streak >= 7 ? `is on a ${item.streak}-inning tear 🔥🔥` :
                       item.streak >= 3 ? `extended their ${item.streak}-inning streak 🔥` :
                       item.streak === 2 ? 'won 2 in a row 💪' :
                       'won their inning 🏆'
        return (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100">
            <span className="text-2xl flex-shrink-0">{mascot}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-brand-navy">
                <span className="font-bold">{name}</span>{' '}
                <span className="text-slate-600">{msg}</span>
              </p>
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(item.closed_at)}</span>
          </div>
        )
      })}
    </div>
  )
}
