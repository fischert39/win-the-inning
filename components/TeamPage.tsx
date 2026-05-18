'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GroupTeam, TeamMemberStats, TeamActivity } from '@/types'
import TeamFeed        from '@/components/TeamFeed'
import TeamScoreboard  from '@/components/TeamScoreboard'
import TeamCreate      from '@/components/TeamCreate'
import TeamJoin        from '@/components/TeamJoin'
import TeamAdmin       from '@/components/TeamAdmin'
import NudgeModal      from '@/components/NudgeModal'

interface Props {
  userId:            string
  displayName:       string | null
  groupTeamId:       string | null
  onUnreadChange:    (count: number) => void
}

type SubTab = 'feed' | 'scoreboard'

export default function TeamPage({ userId, displayName, groupTeamId, onUnreadChange }: Props) {
  const supabase = createClient()

  const [team,        setTeam]        = useState<GroupTeam | null>(null)
  const [members,     setMembers]     = useState<TeamMemberStats[]>([])
  const [feed,        setFeed]        = useState<TeamActivity[]>([])
  const [subTab,      setSubTab]      = useState<SubTab>('feed')
  const [loading,     setLoading]     = useState(true)
  const [feedLoading, setFeedLoading] = useState(false)
  const [mbLoading,   setMbLoading]   = useState(false)
  const [showCreate,  setShowCreate]  = useState(false)
  const [showJoin,    setShowJoin]    = useState(false)
  const [showAdmin,   setShowAdmin]   = useState(false)
  const [nudgeTarget, setNudgeTarget] = useState<{ userId: string; name: string } | null>(null)
  const [toast,       setToast]       = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load team data ────────────────────────────────────────────────────────

  const loadTeam = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_team')
    setTeam(data as GroupTeam | null)
    return data as GroupTeam | null
  }, [supabase])

  const loadScoreboard = useCallback(async (teamId: string) => {
    setMbLoading(true)
    const { data } = await supabase.rpc('get_team_scoreboard', { p_team_id: teamId })
    setMembers((data as TeamMemberStats[]) ?? [])
    setMbLoading(false)
  }, [supabase])

  const loadFeed = useCallback(async (teamId: string) => {
    setFeedLoading(true)
    const { data } = await supabase.rpc('get_team_feed', { p_team_id: teamId })
    setFeed((data as TeamActivity[]) ?? [])
    setFeedLoading(false)
  }, [supabase])

  const loadUnread = useCallback(async () => {
    const { data } = await supabase.rpc('get_unread_nudge_count')
    onUnreadChange((data as number) ?? 0)
  }, [supabase, onUnreadChange])

  const refresh = useCallback(async () => {
    const t = await loadTeam()
    if (t?.id && t.my_status === 'active') {
      await Promise.all([loadScoreboard(t.id), loadFeed(t.id), loadUnread()])
    }
  }, [loadTeam, loadScoreboard, loadFeed, loadUnread])

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [refresh])

  // Mark nudges read when tab is open
  useEffect(() => {
    supabase.rpc('mark_nudges_read').then(() => onUnreadChange(0))
  }, [supabase, onUnreadChange])

  // ── Sub-tab switch loads data lazily ─────────────────────────────────────

  function handleSubTab(tab: SubTab) {
    setSubTab(tab)
    if (!team?.id) return
    if (tab === 'scoreboard' && members.length === 0) loadScoreboard(team.id)
    if (tab === 'feed' && feed.length === 0) loadFeed(team.id)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleCreated(teamId: string, inviteCode: string, teamName: string) {
    setShowCreate(false)
    showToast(`🎉 "${teamName}" created! Share code: ${inviteCode}`)
    await refresh()
  }

  async function handleJoined(teamId: string, teamName: string) {
    setShowJoin(false)
    showToast(`👋 You joined "${teamName}"!`)
    await refresh()
  }

  async function handlePending(teamName: string) {
    setShowJoin(false)
    showToast(`📬 Request sent to "${teamName}" — waiting for approval`)
    await loadTeam()
  }

  async function handleNudgeSent() {
    setNudgeTarget(null)
    showToast('💬 Nudge sent!')
    if (team?.id) await loadFeed(team.id)
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse space-y-4">
        <div className="h-5 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
      </div>
    )
  }

  // ── No team yet ───────────────────────────────────────────────────────────

  if (!team) {
    return (
      <>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="bg-brand-navy px-5 pt-5 pb-4">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Team</p>
            <h2 className="text-white font-black text-xl">Play Together</h2>
            <p className="text-white/60 text-sm mt-1">
              Create or join a team to cheer each other on and track your crew's progress
            </p>
          </div>
          <div className="px-5 py-5 space-y-3">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3.5 rounded-xl bg-brand-orange text-white font-bold text-sm hover:bg-brand-orange-dark transition-colors shadow-sm shadow-brand-orange/20"
            >
              Create a Team
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Join a Team
            </button>
          </div>
        </div>

        {showCreate && (
          <TeamCreate
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        )}
        {showJoin && (
          <TeamJoin
            onJoined={handleJoined}
            onPending={handlePending}
            onCancel={() => setShowJoin(false)}
          />
        )}

        {toast && <Toast msg={toast} />}
      </>
    )
  }

  // ── Pending approval ──────────────────────────────────────────────────────

  if (team.my_status === 'pending') {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center space-y-3">
        <p className="text-3xl">📬</p>
        <p className="font-black text-brand-navy text-lg">{team.name}</p>
        <p className="text-slate-400 text-sm">Your join request is pending approval from the team admin.</p>
        <button
          onClick={async () => {
            await supabase.rpc('leave_team')
            await refresh()
          }}
          className="text-sm text-red-400 hover:text-red-600 font-semibold transition-colors"
        >
          Cancel request
        </button>
      </div>
    )
  }

  // ── Active team ───────────────────────────────────────────────────────────

  const pendingBadge = team.my_role === 'admin' && team.pending_count > 0

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {/* Team header */}
        <div className="bg-brand-navy px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">Team</p>
              <h2 className="text-white font-black text-xl">{team.name}</h2>
              <p className="text-white/50 text-sm mt-0.5">
                {team.member_count} member{team.member_count !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowAdmin(true)}
              className="relative mt-1 p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 text-white/70" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z"/>
              </svg>
              {pendingBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand-orange rounded-full" />
              )}
            </button>
          </div>

          {/* Achievements strip */}
          {team.achievements.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {team.achievements.slice(0, 5).map((a, i) => (
                <span key={i} className="text-[11px] bg-white/10 text-white/80 font-semibold px-2.5 py-1 rounded-full">
                  {a.key.startsWith('full_squad_win') ? '🏆 Full Squad Win'
                   : a.key.startsWith('clean_sweep')   ? '🧹 Clean Sweep'
                   : a.key}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-100">
          {(['feed', 'scoreboard'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleSubTab(tab)}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                subTab === tab
                  ? 'text-brand-orange border-b-2 border-brand-orange'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'feed' ? '📋 Feed' : '📊 Scoreboard'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-4 py-4">
          {subTab === 'feed' ? (
            <>
              <TeamFeed
                items={feed}
                loading={feedLoading}
                myUserId={userId}
              />
              {!feedLoading && feed.length > 0 && (
                <button
                  onClick={() => team.id && loadFeed(team.id)}
                  className="w-full mt-3 py-2 text-xs text-slate-400 hover:text-brand-orange font-semibold transition-colors"
                >
                  Refresh
                </button>
              )}
            </>
          ) : (
            <TeamScoreboard
              members={members}
              loading={mbLoading}
              myUserId={userId}
              onNudge={(uid, name) => setNudgeTarget({ userId: uid, name })}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showAdmin && (
        <TeamAdmin
          team={team}
          members={members}
          myUserId={userId}
          onClose={() => setShowAdmin(false)}
          onLeft={() => { setShowAdmin(false); refresh() }}
          onRefresh={() => { refresh(); setShowAdmin(false); setShowAdmin(true) }}
        />
      )}

      {nudgeTarget && (
        <NudgeModal
          teamId={team.id}
          toUserId={nudgeTarget.userId}
          toName={nudgeTarget.name}
          fromName={displayName ?? 'A teammate'}
          onSent={handleNudgeSent}
          onClose={() => setNudgeTarget(null)}
        />
      )}

      {toast && <Toast msg={toast} />}
    </>
  )
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="bg-brand-navy text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-lg max-w-sm text-center animate-slide-up">
        {msg}
      </div>
    </div>
  )
}
