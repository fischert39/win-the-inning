'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface TeamInfo {
  id:           string
  name:         string
  member_count: number
  is_full:      boolean
}

export default function JoinPage() {
  const params   = useParams()
  const router   = useRouter()
  const code     = ((params.code as string) ?? '').toUpperCase()
  const supabase = createClient()

  const [user,     setUser]     = useState<User | null>(null)
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [joining,  setJoining]  = useState(false)
  const [joined,   setJoined]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const [{ data: { user: u } }, { data: team }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('get_team_by_code', { p_code: code }),
      ])
      setUser(u)
      setTeamInfo(team as TeamInfo | null)
      setLoading(false)
    }
    init()
  }, [code, supabase])

  async function handleJoin() {
    setJoining(true)
    setError(null)
    const { data, error: rpcErr } = await supabase.rpc('join_team_by_code', { p_code: code })
    if (rpcErr || data?.error) {
      const msgs: Record<string, string> = {
        already_on_team: "You're already on a team! Visit the Social tab to see it.",
        team_full:       'This team is full (max 10 members).',
        invalid_code:    'This invite link has expired or is invalid.',
      }
      setError(msgs[data?.error] ?? 'Something went wrong — please try again.')
      setJoining(false)
      return
    }
    setJoined(true)
    setTimeout(() => router.push('/?tab=social'), 1800)
  }

  function handleSignIn() {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/join/${code}`,
      },
    })
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0F3460] flex items-center justify-center p-4">
        <div className="text-white/40 text-sm animate-pulse">Loading…</div>
      </div>
    )
  }

  // ── Invalid code ──────────────────────────────────────────────────────────
  if (!teamInfo) {
    return (
      <Screen>
        <p className="text-4xl mb-4">🤔</p>
        <h1 className="text-2xl font-black text-white mb-2">Link not found</h1>
        <p className="text-white/60 text-sm mb-6">This invite link is invalid or has expired. Ask your teammate to share a new one.</p>
        <button
          onClick={() => router.push('/')}
          className="w-full py-3.5 bg-white text-brand-navy font-bold rounded-xl text-sm"
        >
          Go to app
        </button>
      </Screen>
    )
  }

  // ── Joined success ────────────────────────────────────────────────────────
  if (joined) {
    return (
      <Screen>
        <p className="text-5xl mb-4 animate-bounce">🎉</p>
        <h1 className="text-2xl font-black text-white mb-2">You&apos;re in!</h1>
        <p className="text-white/60 text-sm">Welcome to <strong className="text-white">{teamInfo.name}</strong>. Taking you there now…</p>
      </Screen>
    )
  }

  // ── Team full ─────────────────────────────────────────────────────────────
  if (teamInfo.is_full) {
    return (
      <Screen>
        <p className="text-4xl mb-4">😬</p>
        <h1 className="text-2xl font-black text-white mb-2">{teamInfo.name}</h1>
        <p className="text-white/60 text-sm mb-6">This team is full (10/10 members). Ask your teammate to open a spot.</p>
        <button
          onClick={() => router.push('/')}
          className="w-full py-3.5 bg-white text-brand-navy font-bold rounded-xl text-sm"
        >
          Go to app
        </button>
      </Screen>
    )
  }

  // ── Main invite screen ────────────────────────────────────────────────────
  return (
    <Screen>
      {/* App badge */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">⚾</span>
        <span className="text-white/60 text-sm font-semibold">Win the Inning</span>
      </div>

      {/* Team card */}
      <div className="w-full bg-white/10 border border-white/15 rounded-2xl p-6 mb-6 text-center">
        <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-2">You&apos;re invited to join</p>
        <h1 className="text-3xl font-black text-white mb-1">{teamInfo.name}</h1>
        <p className="text-white/50 text-sm">
          {teamInfo.member_count} member{teamInfo.member_count !== 1 ? 's' : ''} · max 10
        </p>
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${i < teamInfo.member_count ? 'bg-brand-orange' : 'bg-white/15'}`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="w-full bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {user ? (
        /* Logged-in: show join button */
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-4 bg-brand-orange hover:bg-brand-orange-dark text-white font-black text-base rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-brand-orange/30"
        >
          {joining ? 'Joining…' : `Join ${teamInfo.name} ⚾`}
        </button>
      ) : (
        /* Not logged in: sign in → auto-join */
        <>
          <button
            onClick={handleSignIn}
            className="w-full bg-white text-brand-navy font-bold py-4 px-6 rounded-xl text-base hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg mb-3"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google to join
          </button>
          <p className="text-white/30 text-xs text-center">
            New to Win the Inning? You&apos;ll create your account automatically.
          </p>
        </>
      )}
    </Screen>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy via-brand-navy-light to-[#0F3460] flex items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  )
}
