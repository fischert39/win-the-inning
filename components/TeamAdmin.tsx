'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GroupTeam, TeamMemberStats, PendingRequest } from '@/types'

interface Props {
  team:        GroupTeam
  members:     TeamMemberStats[]
  myUserId:    string
  onClose:     () => void
  onLeft:      () => void
  onRefresh:   () => void
}

export default function TeamAdmin({ team, members, myUserId, onClose, onLeft, onRefresh }: Props) {
  const supabase   = createClient()
  const isAdmin    = team.my_role === 'admin'
  const [pending,  setPending]  = useState<PendingRequest[]>([])
  const [loading,  setLoading]  = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [confirm,  setConfirm]  = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    if (!isAdmin) return
    const { data } = await supabase.rpc('get_pending_requests')
    setPending((data as PendingRequest[]) ?? [])
  }, [isAdmin, supabase])

  useEffect(() => { loadPending() }, [loadPending])

  function copyInviteCode() {
    if (!team.invite_code) return
    navigator.clipboard.writeText(team.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRequest(userId: string, approve: boolean) {
    setLoading(true)
    await supabase.rpc('handle_join_request', { p_user_id: userId, p_approve: approve })
    await loadPending()
    onRefresh()
    setLoading(false)
  }

  async function handleRemove(userId: string) {
    setConfirm(null)
    setLoading(true)
    await supabase.rpc('leave_team', { p_user_id: userId })
    onRefresh()
    setLoading(false)
  }

  async function handlePromote(userId: string, currentRole: string) {
    setLoading(true)
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    await supabase.rpc('set_member_role', { p_user_id: userId, p_role: newRole })
    onRefresh()
    setLoading(false)
  }

  async function handleLeave() {
    setConfirm(null)
    setLoading(true)
    await supabase.rpc('leave_team')
    onLeft()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-brand-navy font-black text-xl">{team.name}</h2>
            <p className="text-slate-400 text-sm">{team.member_count} member{team.member_count !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none mt-0.5">×</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Invite code (admin only) */}
          {isAdmin && team.invite_code && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Invite Code</p>
              <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <span className="flex-1 font-mono font-black text-xl text-brand-navy tracking-widest">
                  {team.invite_code}
                </span>
                <button
                  onClick={copyInviteCode}
                  className={`text-xs font-bold transition-colors ${copied ? 'text-green-600' : 'text-brand-orange hover:underline'}`}
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Share this code so teammates can join instantly</p>
            </div>
          )}

          {/* Pending requests (admin only) */}
          {isAdmin && pending.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Join Requests ({pending.length})
              </p>
              <div className="space-y-2">
                {pending.map(req => (
                  <div key={req.user_id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-brand-navy">{req.display_name ?? 'Unknown'}</p>
                    </div>
                    <button
                      onClick={() => handleRequest(req.user_id, false)}
                      disabled={loading}
                      className="text-xs text-red-400 font-bold hover:text-red-600 transition-colors"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => handleRequest(req.user_id, true)}
                      disabled={loading}
                      className="text-xs bg-brand-orange text-white font-bold px-3 py-1.5 rounded-lg hover:bg-brand-orange-dark transition-colors"
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members list */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Members</p>
            <div className="space-y-2">
              {members.map(m => {
                const isMe = m.user_id === myUserId
                return (
                  <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                      {m.mascot ?? '⚾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm text-brand-navy truncate">{m.display_name ?? 'Teammate'}</p>
                        {isMe && <span className="text-[10px] text-slate-400">(you)</span>}
                      </div>
                      <p className="text-xs text-slate-400">{m.role}</p>
                    </div>
                    {isAdmin && !isMe && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePromote(m.user_id, m.role)}
                          disabled={loading}
                          className="text-[11px] text-slate-400 hover:text-brand-orange font-semibold transition-colors"
                        >
                          {m.role === 'admin' ? 'Remove admin' : 'Make admin'}
                        </button>
                        <button
                          onClick={() => setConfirm(m.user_id)}
                          disabled={loading}
                          className="text-[11px] text-red-300 hover:text-red-500 font-semibold transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Leave team */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setConfirm('self')}
              className="w-full py-3 text-sm font-bold text-red-400 hover:text-red-600 transition-colors"
            >
              Leave Team
            </button>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <p className="font-bold text-brand-navy text-center">
              {confirm === 'self' ? 'Leave the team?' : 'Remove this member?'}
            </p>
            <p className="text-sm text-slate-400 text-center">
              {confirm === 'self'
                ? "You'll need a new invite code to rejoin."
                : "They'll be removed immediately."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => confirm === 'self' ? handleLeave() : handleRemove(confirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors"
              >
                {confirm === 'self' ? 'Leave' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
