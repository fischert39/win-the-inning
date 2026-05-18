'use client'

import type { TeamActivity } from '@/types'

interface Props {
  items:   TeamActivity[]
  loading: boolean
  myUserId: string
}

const ICONS: Record<string, string> = {
  inning_won:          '🏆',
  inning_closed:       '📋',
  game_won:            '🎉',
  game_lost:           '😤',
  nudge_sent:          '💬',
  member_joined:       '👋',
  achievement_unlocked:'⚡',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function activityText(item: TeamActivity, myUserId: string): { main: string; sub?: string } {
  const name = item.display_name ?? 'Someone'
  const isMe = item.user_id === myUserId
  const actor = isMe ? 'You' : name
  const m = item.metadata

  switch (item.type) {
    case 'inning_won': {
      const runs = m.runs as number ?? 0
      return {
        main: `${actor} won the inning! 🏆`,
        sub:  runs > 0 ? `${runs} run${runs !== 1 ? 's' : ''} scored` : undefined,
      }
    }
    case 'inning_closed':
      return { main: `${actor} closed their inning` }
    case 'game_won':
      return {
        main: `${actor} won the game! 🎉`,
        sub:  m.week ? `Week of ${m.week as string}` : undefined,
      }
    case 'game_lost':
      return { main: `${actor} finished the week`, sub: 'Better luck next game!' }
    case 'nudge_sent': {
      const preset = m.preset_key as string
      const labels: Record<string, string> = {
        lets_go:      "Let's go! 🔥",
        keep_it_up:   'Keep it up 💪',
        you_got_this: 'You got this ⚾',
        nice_work:    'Nice work! 🏆',
      }
      const to = m.to_name as string ?? 'a teammate'
      return {
        main: `${actor} nudged ${isMe ? '' : (m.to_user_id === myUserId ? 'you' : to)}`,
        sub:  (labels[preset] ?? preset) + (m.custom_message ? ` — ${m.custom_message as string}` : ''),
      }
    }
    case 'member_joined':
      return { main: `${actor} joined the team 👋` }
    case 'achievement_unlocked':
      return {
        main: (m.label as string) ?? '⚡ Achievement Unlocked',
        sub:  (m.detail as string) ?? undefined,
      }
    default:
      return { main: `${actor} did something` }
  }
}

export default function TeamFeed({ items, loading, myUserId }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 bg-slate-100 rounded w-3/4" />
              <div className="h-2.5 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-300 text-sm">
        <p className="text-2xl mb-2">⚾</p>
        <p>No activity yet — close an inning to get started!</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map(item => {
        const { main, sub } = activityText(item, myUserId)
        const icon = item.type === 'achievement_unlocked'
          ? (item.metadata.key as string)?.startsWith('full_squad') ? '🏆' : '🧹'
          : ICONS[item.type] ?? '⚾'
        const isAchievement = item.type === 'achievement_unlocked'

        return (
          <div
            key={item.id}
            className={`flex gap-3 py-2.5 px-3 rounded-xl ${
              isAchievement ? 'bg-amber-50 border border-amber-100' : ''
            }`}
          >
            <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm ${
              isAchievement ? 'bg-amber-100' : 'bg-slate-100'
            }`}>
              {item.mascot ?? icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className={`text-sm font-semibold leading-snug ${isAchievement ? 'text-amber-700' : 'text-brand-navy'}`}>
                {main}
              </p>
              {sub && (
                <p className={`text-xs mt-0.5 ${isAchievement ? 'text-amber-600' : 'text-slate-400'}`}>{sub}</p>
              )}
            </div>
            <span className="text-[10px] text-slate-300 flex-shrink-0 pt-1 whitespace-nowrap">
              {timeAgo(item.created_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
