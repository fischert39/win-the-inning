'use client'

import type { TeamMemberStats } from '@/types'

interface Props {
  members:   TeamMemberStats[]
  loading:   boolean
  myUserId:  string
  onNudge:   (userId: string, displayName: string) => void
}

const STATUS_CONFIG = {
  won:    { label: 'Won ✓',     bg: 'bg-green-100',  text: 'text-green-700'  },
  closed: { label: 'Closed',    bg: 'bg-slate-100',  text: 'text-slate-500'  },
  open:   { label: 'In progress', bg: 'bg-sky-100',  text: 'text-sky-700'    },
  none:   { label: 'Not started', bg: 'bg-slate-50', text: 'text-slate-400'  },
}

export default function TeamScoreboard({ members, loading, myUserId, onNudge }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-50 rounded-2xl p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                <div className="h-2.5 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-slate-300 text-sm">
        <p className="text-2xl mb-2">👥</p>
        <p>No members yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {members.map((m, idx) => {
        const isMe = m.user_id === myUserId
        const status = STATUS_CONFIG[m.today_status]
        const pct = m.innings_played > 0
          ? Math.round((m.innings_won / m.innings_played) * 100)
          : 0

        return (
          <div
            key={m.user_id}
            className={`rounded-2xl border transition-all ${
              isMe ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-slate-100 bg-white'
            }`}
          >
            <div className="px-4 pt-4 pb-3">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl leading-none">
                  {m.mascot ?? '⚾'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-black text-brand-navy text-sm truncate">
                      {m.display_name ?? 'Teammate'}
                    </p>
                    {isMe && (
                      <span className="text-[10px] bg-brand-orange/10 text-brand-orange font-bold px-1.5 py-0.5 rounded-full">You</span>
                    )}
                    {m.role === 'admin' && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-full">Admin</span>
                    )}
                    {idx === 0 && members.length > 1 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">🥇 Leader</span>
                    )}
                  </div>
                  {m.team_name && (
                    <p className="text-xs text-slate-400 truncate">{m.team_name}</p>
                  )}
                </div>

                {/* Today badge */}
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex gap-4 mt-3 text-center">
                <StatPill label="Season" value={`${m.innings_won}–${m.innings_played - m.innings_won}`} />
                <StatPill label="Win %" value={`${pct}%`} highlight={pct >= 70} />
                <StatPill label="Games" value={`${m.game_wins}–${m.game_losses}`} />
                {m.win_streak > 1 && (
                  <StatPill label="Streak" value={`${m.win_streak}🔥`} highlight />
                )}
                {m.today_status !== 'none' && (
                  <StatPill label="Today" value={`${m.today_runs} run${m.today_runs !== 1 ? 's' : ''}`} />
                )}
              </div>

              {/* Nudge button (not for self) */}
              {!isMe && (
                <button
                  onClick={() => onNudge(m.user_id, m.display_name ?? 'Teammate')}
                  className="mt-3 w-full py-2 rounded-xl border border-slate-200 text-slate-500 text-xs font-bold hover:border-brand-orange hover:text-brand-orange transition-colors"
                >
                  Send Nudge 🔥
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-0">
      <span className={`text-sm font-black tabular-nums leading-tight ${highlight ? 'text-brand-orange' : 'text-brand-navy'}`}>
        {value}
      </span>
      <span className="text-[10px] text-slate-400 mt-0.5">{label}</span>
    </div>
  )
}
