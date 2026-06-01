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

  // Fetch all data in parallel
  const [
    authUsers,
    profilesResult,
    seasonsResult,
    gamesResult,
    inningsResult,
    goalsResult,
  ] = await Promise.all([
    listAllUsers(admin),
    admin.from('profiles').select('*'),
    admin.from('seasons').select('id, user_id, is_current, created_at'),
    admin.from('games').select('id, user_id, result'),
    // eslint-disable-next-line max-len
    admin.from('innings').select('id, user_id, status, result, is_rain_delay, pinch_hit_used, closed_at, mind_task, mind_completed, spirit_task, spirit_completed, body_task, body_completed'),
    admin.from('offense_goals').select('id, user_id, completed, hit_type, created_at'),
  ])

  const profiles  = profilesResult.data  ?? []
  const seasons   = seasonsResult.data   ?? []
  const games     = gamesResult.data     ?? []
  const innings   = inningsResult.data   ?? []
  const goals     = goalsResult.data     ?? []

  const now       = new Date()
  const weekAgo   = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000)
  const monthAgo  = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ─── Build per-user aggregate maps ──────────────────────────────────────────

  const profileMap = new Map(profiles.map(p => [p.id, p]))

  // Game aggregates
  type GameAgg = { total: number; won: number; lost: number; tied: number }
  const gameAgg = new Map<string, GameAgg>()
  for (const g of games) {
    const cur = gameAgg.get(g.user_id) ?? { total: 0, won: 0, lost: 0, tied: 0 }
    cur.total++
    if      (g.result === 'WIN')  cur.won++
    else if (g.result === 'LOSS') cur.lost++
    else if (g.result === 'TIE')  cur.tied++
    gameAgg.set(g.user_id, cur)
  }

  // Inning aggregates (closed only)
  type InningAgg = {
    total: number; won: number; rainDelay: number
    lastActive: string | null
    mindTotal: number; mindDone: number
    spiritTotal: number; spiritDone: number
    bodyTotal: number; bodyDone: number
  }
  const inningAgg = new Map<string, InningAgg>()
  for (const i of innings) {
    if (i.status !== 'CLOSED') continue
    const cur = inningAgg.get(i.user_id) ?? {
      total: 0, won: 0, rainDelay: 0, lastActive: null,
      mindTotal: 0, mindDone: 0, spiritTotal: 0, spiritDone: 0, bodyTotal: 0, bodyDone: 0,
    }
    cur.total++
    if (i.result === 'WIN') cur.won++
    if (i.is_rain_delay)    cur.rainDelay++
    if (i.closed_at && (!cur.lastActive || i.closed_at > cur.lastActive)) cur.lastActive = i.closed_at
    if (i.mind_task)   { cur.mindTotal++;   if (i.mind_completed)   cur.mindDone++ }
    if (i.spirit_task) { cur.spiritTotal++; if (i.spirit_completed) cur.spiritDone++ }
    if (i.body_task)   { cur.bodyTotal++;   if (i.body_completed)   cur.bodyDone++ }
    inningAgg.set(i.user_id, cur)
  }

  // Goal aggregates
  type GoalAgg = { total: number; done: number; singles: number; doubles: number; triples: number; homers: number }
  const goalAgg = new Map<string, GoalAgg>()
  for (const g of goals) {
    const cur = goalAgg.get(g.user_id) ?? { total: 0, done: 0, singles: 0, doubles: 0, triples: 0, homers: 0 }
    cur.total++
    if (g.completed)            cur.done++
    if (g.hit_type === 'single') cur.singles++
    else if (g.hit_type === 'double') cur.doubles++
    else if (g.hit_type === 'triple') cur.triples++
    else if (g.hit_type === 'homer')  cur.homers++
    goalAgg.set(g.user_id, cur)
  }

  // Season aggregates
  type SeasonAgg = { total: number; active: number }
  const seasonAgg = new Map<string, SeasonAgg>()
  for (const s of seasons) {
    const cur = seasonAgg.get(s.user_id) ?? { total: 0, active: 0 }
    cur.total++
    if (s.is_current) cur.active++
    seasonAgg.set(s.user_id, cur)
  }

  // ─── Build per-user rows ─────────────────────────────────────────────────────

  const emptyIA: InningAgg = {
    total: 0, won: 0, rainDelay: 0, lastActive: null,
    mindTotal: 0, mindDone: 0, spiritTotal: 0, spiritDone: 0, bodyTotal: 0, bodyDone: 0,
  }

  const rows: AdminUserRow[] = authUsers.map(authUser => {
    const profile = profileMap.get(authUser.id)
    const ga  = gameAgg.get(authUser.id)   ?? { total: 0, won: 0, lost: 0, tied: 0 }
    const ia  = inningAgg.get(authUser.id) ?? emptyIA
    const goa = goalAgg.get(authUser.id)   ?? { total: 0, done: 0, singles: 0, doubles: 0, triples: 0, homers: 0 }
    const sa  = seasonAgg.get(authUser.id) ?? { total: 0, active: 0 }

    return {
      id:            authUser.id,
      email:         authUser.email ?? '',
      displayName:   profile?.display_name ?? 'Unknown',
      username:      profile?.username     ?? null,
      sport:         profile?.sport        ?? 'softball',
      teamName:      profile?.team_name    ?? null,
      joinedAt:      authUser.created_at,
      lastActive:    ia.lastActive,

      totalSeasons:  sa.total,
      activeSeasons: sa.active,

      totalGames:    ga.total,
      gamesWon:      ga.won,
      gamesLost:     ga.lost,
      gamesTied:     ga.tied,
      gameWinPct:    pct(ga.won, ga.won + ga.lost + ga.tied),

      totalInnings:  ia.total,
      inningsWon:    ia.won,
      inningWinPct:  pct(ia.won, ia.total),
      rainDelayInnings: ia.rainDelay,

      totalGoals:    goa.total,
      goalsCompleted: goa.done,
      goalCompPct:   pct(goa.done, goa.total),
      singles:       goa.singles,
      doubles:       goa.doubles,
      triples:       goa.triples,
      homers:        goa.homers,

      mindTotal:     ia.mindTotal,
      mindCompleted: ia.mindDone,
      mindCompPct:   pct(ia.mindDone, ia.mindTotal),
      spiritTotal:   ia.spiritTotal,
      spiritCompleted: ia.spiritDone,
      spiritCompPct: pct(ia.spiritDone, ia.spiritTotal),
      bodyTotal:     ia.bodyTotal,
      bodyCompleted: ia.bodyDone,
      bodyCompPct:   pct(ia.bodyDone, ia.bodyTotal),

      bibleVerse:          profile?.daily_bible_verse  ?? false,
      autoCarry:           profile?.auto_carry_tasks   ?? false,
      isDiscoverable:      profile?.is_discoverable    ?? false,
    }
  })

  // ─── Global stats ────────────────────────────────────────────────────────────

  const closedInnings = innings.filter(i => i.status === 'CLOSED')

  const activeIds7d  = new Set(closedInnings.filter(i => i.closed_at && new Date(i.closed_at) >= weekAgo ).map(i => i.user_id))
  const activeIds30d = new Set(closedInnings.filter(i => i.closed_at && new Date(i.closed_at) >= monthAgo).map(i => i.user_id))

  const globalGoals = goals.reduce(
    (acc, g) => {
      acc.total++
      if (g.completed)                  acc.done++
      if      (g.hit_type === 'single') acc.singles++
      else if (g.hit_type === 'double') acc.doubles++
      else if (g.hit_type === 'triple') acc.triples++
      else if (g.hit_type === 'homer')  acc.homers++
      return acc
    },
    { total: 0, done: 0, singles: 0, doubles: 0, triples: 0, homers: 0 }
  )

  const defense = closedInnings.reduce(
    (acc, i) => {
      if (i.mind_task)   { acc.mindTotal++;   if (i.mind_completed)   acc.mindDone++ }
      if (i.spirit_task) { acc.spiritTotal++; if (i.spirit_completed) acc.spiritDone++ }
      if (i.body_task)   { acc.bodyTotal++;   if (i.body_completed)   acc.bodyDone++ }
      return acc
    },
    { mindTotal: 0, mindDone: 0, spiritTotal: 0, spiritDone: 0, bodyTotal: 0, bodyDone: 0 }
  )

  const stats: AdminStats = {
    totalUsers:     authUsers.length,
    newThisWeek:    authUsers.filter(u => new Date(u.created_at) >= weekAgo).length,
    newThisMonth:   authUsers.filter(u => new Date(u.created_at) >= monthAgo).length,
    activeThisWeek: activeIds7d.size,
    activeThisMonth: activeIds30d.size,

    totalSeasons:    seasons.length,
    activeSeasons:   seasons.filter(s => s.is_current).length,

    totalGames:      games.length,
    gamesWon:        games.filter(g => g.result === 'WIN').length,
    gamesLost:       games.filter(g => g.result === 'LOSS').length,
    gamesTied:       games.filter(g => g.result === 'TIE').length,
    gamesInProgress: games.filter(g => g.result === 'IN_PROGRESS').length,

    totalInnings:      closedInnings.length,
    inningsWon:        closedInnings.filter(i => i.result === 'WIN').length,
    rainDelayInnings:  closedInnings.filter(i => i.is_rain_delay).length,

    totalGoals:    globalGoals.total,
    goalsCompleted: globalGoals.done,
    singles:       globalGoals.singles,
    doubles:       globalGoals.doubles,
    triples:       globalGoals.triples,
    homers:        globalGoals.homers,

    mindTotal:     defense.mindTotal,
    mindCompleted: defense.mindDone,
    spiritTotal:   defense.spiritTotal,
    spiritCompleted: defense.spiritDone,
    bodyTotal:     defense.bodyTotal,
    bodyCompleted: defense.bodyDone,

    bibleVerseUsers:    profiles.filter(p => p.daily_bible_verse).length,
    autoCarryUsers:     profiles.filter(p => p.auto_carry_tasks).length,
    discoverableUsers:  profiles.filter(p => p.is_discoverable).length,
    usernameSetUsers:   profiles.filter(p => p.username).length,
  }

  return <AdminDashboard stats={stats} users={rows} />
}
