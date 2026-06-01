import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AdminDashboard from '@/components/AdminDashboard'
import type { AdminUserRow, AdminStats } from '@/components/AdminDashboard'

const ADMIN_EMAIL = 'fischert39@gmail.com'

function pct(num: number, den: number): number | null {
  if (den === 0) return null
  return Math.round((num / den) * 100)
}

// listUsers returns at most `perPage` rows per call. Page through them all so the
// dashboard doesn't silently undercount once there are more than 1000 accounts.
async function listAllUsers(admin: ReturnType<typeof createAdminClient>): Promise<User[]> {
  const perPage = 1000
  const all: User[] = []
  for (let page = 1; page <= 100; page++) {  // hard ceiling (100k) guards against a runaway loop
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data) break
    all.push(...data.users)
    if (data.users.length < perPage) break
  }
  return all
}

export default async function AdminPage() {
  // Gate: only the admin email may access this page
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) redirect('/')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <p className="text-brand-navy font-semibold mb-2">Setup Required</p>
          <p className="text-slate-500 text-sm">Add <code className="bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> to your environment variables.</p>
        </div>
      </div>
    )
  }

  const admin = createAdminClient()

  // Aggregation happens in Postgres (see migration 021_admin_stats.sql); the app
  // only fetches the auth user list (identity + signup dates) plus two compact
  // rollup results, instead of streaming every innings/goals row.
  const [authUsers, userStatsRes, globalRes] = await Promise.all([
    listAllUsers(admin),
    admin.rpc('admin_user_stats'),
    admin.rpc('admin_global_stats'),
  ])

  // If the migration hasn't been applied yet, the RPCs won't exist. Show a clear
  // setup message rather than a stack trace.
  if (userStatsRes.error || globalRes.error || !userStatsRes.data || !globalRes.data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 max-w-md text-center">
          <p className="text-brand-navy font-semibold mb-2">Migration Required</p>
          <p className="text-slate-500 text-sm">
            Run <code className="bg-slate-100 px-1 rounded">supabase/migrations/021_admin_stats.sql</code> in the
            Supabase SQL editor to enable the admin dashboard.
          </p>
          {userStatsRes.error && (
            <p className="text-slate-400 text-xs mt-3 font-mono break-words">{userStatsRes.error.message}</p>
          )}
        </div>
      </div>
    )
  }

  const userStats = userStatsRes.data as UserStatRow[]
  const global    = globalRes.data as GlobalStatsRpc
  const statMap   = new Map(userStats.map(s => [s.user_id, s]))

  const now      = new Date()
  const weekAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ─── Per-user rows: auth identity + the aggregated stat row ──────────────────
  const rows: AdminUserRow[] = authUsers.map(authUser => {
    const s = statMap.get(authUser.id)
    return {
      id:            authUser.id,
      email:         authUser.email ?? '',
      displayName:   s?.display_name ?? 'Unknown',
      username:      s?.username     ?? null,
      sport:         s?.sport        ?? 'softball',
      teamName:      s?.team_name    ?? null,
      joinedAt:      authUser.created_at,
      lastActive:    s?.last_active  ?? null,

      totalSeasons:  s?.total_seasons  ?? 0,
      activeSeasons: s?.active_seasons ?? 0,

      totalGames:    s?.total_games ?? 0,
      gamesWon:      s?.games_won   ?? 0,
      gamesLost:     s?.games_lost  ?? 0,
      gamesTied:     s?.games_tied  ?? 0,
      gameWinPct:    pct(s?.games_won ?? 0, (s?.games_won ?? 0) + (s?.games_lost ?? 0) + (s?.games_tied ?? 0)),

      totalInnings:  s?.total_innings ?? 0,
      inningsWon:    s?.innings_won   ?? 0,
      inningWinPct:  pct(s?.innings_won ?? 0, s?.total_innings ?? 0),
      rainDelayInnings: s?.rain_delay_innings ?? 0,

      totalGoals:    s?.total_goals     ?? 0,
      goalsCompleted: s?.goals_completed ?? 0,
      goalCompPct:   pct(s?.goals_completed ?? 0, s?.total_goals ?? 0),
      singles:       s?.singles ?? 0,
      doubles:       s?.doubles ?? 0,
      triples:       s?.triples ?? 0,
      homers:        s?.homers  ?? 0,

      mindTotal:     s?.mind_total ?? 0,
      mindCompleted: s?.mind_done  ?? 0,
      mindCompPct:   pct(s?.mind_done ?? 0, s?.mind_total ?? 0),
      spiritTotal:   s?.spirit_total ?? 0,
      spiritCompleted: s?.spirit_done ?? 0,
      spiritCompPct: pct(s?.spirit_done ?? 0, s?.spirit_total ?? 0),
      bodyTotal:     s?.body_total ?? 0,
      bodyCompleted: s?.body_done  ?? 0,
      bodyCompPct:   pct(s?.body_done ?? 0, s?.body_total ?? 0),

      bibleVerse:     s?.bible_verse     ?? false,
      autoCarry:      s?.auto_carry      ?? false,
      isDiscoverable: s?.is_discoverable ?? false,
    }
  })

  // ─── Global stats: auth-derived counts + the SQL rollup ──────────────────────
  const stats: AdminStats = {
    totalUsers:   authUsers.length,
    newThisWeek:  authUsers.filter(u => new Date(u.created_at) >= weekAgo).length,
    newThisMonth: authUsers.filter(u => new Date(u.created_at) >= monthAgo).length,
    ...global,
  }

  return <AdminDashboard stats={stats} users={rows} />
}

// ─── RPC result shapes ─────────────────────────────────────────────────────────

interface UserStatRow {
  user_id:            string
  display_name:       string | null
  username:           string | null
  sport:              string | null
  team_name:          string | null
  bible_verse:        boolean
  auto_carry:         boolean
  is_discoverable:    boolean
  last_active:        string | null
  total_seasons:      number
  active_seasons:     number
  total_games:        number
  games_won:          number
  games_lost:         number
  games_tied:         number
  total_innings:      number
  innings_won:        number
  rain_delay_innings: number
  total_goals:        number
  goals_completed:    number
  singles:            number
  doubles:            number
  triples:            number
  homers:             number
  mind_total:         number
  mind_done:          number
  spirit_total:       number
  spirit_done:        number
  body_total:         number
  body_done:          number
}

// admin_global_stats returns every AdminStats field except the auth-derived ones.
type GlobalStatsRpc = Omit<AdminStats, 'totalUsers' | 'newThisWeek' | 'newThisMonth'>
