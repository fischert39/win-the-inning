'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile, FullSeason, FullGame, FullInning, OffenseGoal, SeasonGoal, Sport, HitType, GameResult, Status } from '@/types'
import {
  today, getWeekStart, getWeekEnd, inningNumber,
  countOuts, simulateRuns, inningResult, gameResult, getDailyQuote, currentStreak, getPrevDate,
} from '@/lib/game-logic'
import { computeAchievements } from '@/lib/achievements'
import AppHeader      from '@/components/AppHeader'
import SeasonGate     from '@/components/SeasonGate'
import SeasonRecap    from '@/components/SeasonRecap'
import PastSeasons    from '@/components/PastSeasons'
import WinCelebration from '@/components/WinCelebration'
import Scoreboard   from '@/components/Scoreboard'
import SeasonGoals  from '@/components/SeasonGoals'
import DailyQuote   from '@/components/DailyQuote'
import DefenseSection from '@/components/DefenseSection'
import OffenseSection from '@/components/OffenseSection'
import EndOfDay        from '@/components/EndOfDay'
import Achievements   from '@/components/Achievements'
import SeasonTrends      from '@/components/SeasonTrends'
import WeeklyWrapUp      from '@/components/WeeklyWrapUp'
import FriendComparison  from '@/components/FriendComparison'

export default function AppPage() {
  const [user,      setUser]      = useState<User | null>(null)
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [season,    setSeason]    = useState<FullSeason | null>(null)
  const [viewDate,  setViewDate]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState<string | null>(null)
  const [recapSeason,      setRecapSeason]      = useState<FullSeason | null>(null)
  const [showPastSeasons,  setShowPastSeasons]  = useState(false)
  const [showWinCelebration, setShowWinCelebration] = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  const todayStr = today()

  // ===== TOAST =====
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ===== LOAD =====
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUser(user)

    const { data: prof } = await supabase
      .from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile(prof)

    const { data: raw } = await supabase
      .from('seasons')
      .select('*, season_goals(*), games(*, innings(*, offense_goals(*)))')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (raw) {
      raw.season_goals = (raw.season_goals || []).sort(
        (a: SeasonGoal, b: SeasonGoal) => a.sort_order - b.sort_order)
      raw.games = (raw.games || [])
        .sort((a: FullGame, b: FullGame) => a.week_start.localeCompare(b.week_start))
        .map((g: FullGame) => ({
          ...g,
          innings: (g.innings || [])
            .sort((a: FullInning, b: FullInning) => a.date.localeCompare(b.date))
            .map((i: FullInning) => ({
              ...i,
              offense_goals: (i.offense_goals || [])
                .sort((a: OffenseGoal, b: OffenseGoal) => a.sort_order - b.sort_order),
            })),
        }))
    }
    setSeason(raw)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [])

  // ===== COMPUTED =====
  const vDate      = viewDate || todayStr
  const viewGame   = season?.games.find(g => g.week_start <= vDate && g.week_end >= vDate) ?? null
  const viewInning = viewGame?.innings.find(i => i.date === vDate) ?? null

  function getSeasonRecord() {
    if (!season) return { wins: 0, losses: 0 }
    let wins = 0, losses = 0
    for (const g of season.games) {
      const r = gameResult(g.innings)
      if (r === 'WIN') wins++
      else if (r === 'LOSS') losses++
    }
    return { wins, losses }
  }

  // ===== STATE UPDATERS =====
  function updateInning(inningId: string, updates: Partial<FullInning>) {
    setSeason(prev => !prev ? prev : {
      ...prev,
      games: prev.games.map(g => ({
        ...g,
        innings: g.innings.map(i => i.id === inningId ? { ...i, ...updates } : i),
      })),
    })
  }

  function updateGame(gameId: string, updates: Partial<FullGame>) {
    setSeason(prev => !prev ? prev : {
      ...prev,
      games: prev.games.map(g => g.id === gameId ? { ...g, ...updates } : g),
    })
  }

  function addGoal(inningId: string, goal: OffenseGoal) {
    setSeason(prev => !prev ? prev : {
      ...prev,
      games: prev.games.map(g => ({
        ...g,
        innings: g.innings.map(i =>
          i.id === inningId ? { ...i, offense_goals: [...i.offense_goals, goal] } : i),
      })),
    })
  }

  function patchGoal(inningId: string, goalId: string, updates: Partial<OffenseGoal>) {
    setSeason(prev => !prev ? prev : {
      ...prev,
      games: prev.games.map(g => ({
        ...g,
        innings: g.innings.map(i =>
          i.id === inningId
            ? { ...i, offense_goals: i.offense_goals.map(og => og.id === goalId ? { ...og, ...updates } : og) }
            : i),
      })),
    })
  }

  function removeGoal(inningId: string, goalId: string) {
    setSeason(prev => !prev ? prev : {
      ...prev,
      games: prev.games.map(g => ({
        ...g,
        innings: g.innings.map(i =>
          i.id === inningId
            ? { ...i, offense_goals: i.offense_goals.filter(og => og.id !== goalId) }
            : i),
      })),
    })
  }

  function patchSeasonGoal(goalId: string, updates: Partial<SeasonGoal>) {
    setSeason(prev => !prev ? prev : {
      ...prev,
      season_goals: prev.season_goals.map(g => g.id === goalId ? { ...g, ...updates } : g),
    })
  }

  // ===== SEASON ACTIONS =====
  async function handleStartSeason(sport: Sport) {
    if (!user) return
    const t   = todayStr
    const sid = 's_' + t + '_' + Date.now()
    const ws  = getWeekStart(t)
    const we  = getWeekEnd(ws)
    const gid = 'g_' + ws + '_' + Date.now()
    const iid = 'i_' + t  + '_' + Date.now()

    await supabase.from('seasons').update({ is_current: false }).eq('user_id', user.id).eq('is_current', true)
    await supabase.from('seasons').insert({ id: sid, user_id: user.id, start_date: t, is_current: true })
    await supabase.from('profiles').update({ sport }).eq('id', user.id)
    await supabase.from('games').insert({ id: gid, user_id: user.id, season_id: sid, week_start: ws, week_end: we })
    await supabase.from('innings').insert({
      id: iid, user_id: user.id, game_id: gid, date: t,
      inning_number: inningNumber(t), target_goals: 5,
      mind_task: '', mind_completed: false,
      spirit_task: '', spirit_completed: false,
      body_task: '', body_completed: false,
      reflection: '', future_goals: '',
      status: 'IN_PROGRESS', result: 'IN_PROGRESS',
    })
    setProfile(prev => prev ? { ...prev, sport } : prev)
    await loadData()
  }

  async function handleEndSeason() {
    if (!season) return
    if (!confirm('End this season? Your record will be saved.')) return
    await supabase.from('seasons').update({ end_date: todayStr, is_current: false }).eq('id', season.id)
    setRecapSeason({ ...season, end_date: todayStr })
    setSeason(null)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ===== VIEW DATE =====
  async function handleViewDate(date: string) {
    if (!season || !user) return
    setViewDate(date)

    // Ensure game exists for this week
    let game = season.games.find(g => g.week_start <= date && g.week_end >= date)
    if (!game) {
      const ws  = getWeekStart(date)
      const we  = getWeekEnd(ws)
      const gid = 'g_' + ws + '_' + Date.now()
      const { data: newGame } = await supabase
        .from('games')
        .insert({ id: gid, user_id: user.id, season_id: season.id, week_start: ws, week_end: we })
        .select().single()
      if (!newGame) return
      game = { ...newGame, innings: [] }
      setSeason(prev => prev ? { ...prev, games: [...prev.games, game!].sort((a, b) => a.week_start.localeCompare(b.week_start)) } : prev)
    }

    if (!game) return  // TypeScript guard — game is always defined at this point

    // Ensure inning exists for this date
    if (!game.innings.find(i => i.date === date)) {
      const iid = 'i_' + date + '_' + Date.now()
      const { data: newInning } = await supabase
        .from('innings')
        .insert({
          id: iid, user_id: user.id, game_id: game.id, date,
          inning_number: inningNumber(date), target_goals: 5,
          mind_task:   profile?.default_mind_task   ?? '',
          mind_completed: false,
          spirit_task: profile?.default_spirit_task ?? '',
          spirit_completed: false,
          body_task:   profile?.default_body_task   ?? '',
          body_completed: false,
          reflection: '', future_goals: '',
          status: 'IN_PROGRESS', result: 'IN_PROGRESS',
        })
        .select().single()
      if (!newInning) return
      let offenseGoals: OffenseGoal[] = []

      // Auto-populate from previous day's future_goals
      const prevDate    = getPrevDate(date)
      const prevInning  = season.games.flatMap(g => g.innings).find(i => i.date === prevDate)
      if (prevInning?.future_goals?.trim()) {
        const lines = prevInning.future_goals.split('\n').map((l: string) => l.trim()).filter(Boolean)
        const inserts = lines.map((text: string, idx: number) => ({
          id: 'r_' + Date.now() + '_' + idx,
          user_id: user.id,
          inning_id: iid,
          goal: text,
          completed: false,
          hit_type: 'single' as const,
          sort_order: idx,
        }))
        if (inserts.length > 0) {
          const { data: inserted } = await supabase.from('offense_goals').insert(inserts).select()
          if (inserted) offenseGoals = inserted
        }
      }

      const inning: FullInning = { ...newInning, offense_goals: offenseGoals }
      setSeason(prev => !prev ? prev : {
        ...prev,
        games: prev.games.map(g =>
          g.id === game!.id
            ? { ...g, innings: [...g.innings, inning].sort((a, b) => a.date.localeCompare(b.date)) }
            : g),
      })
    }
  }

  // ===== DEFENSE ACTIONS =====
  async function handleToggleDefense(cat: 'mind' | 'spirit' | 'body') {
    if (!viewInning) return
    const key     = `${cat}_completed` as 'mind_completed' | 'spirit_completed' | 'body_completed'
    const newVal  = !viewInning[key]
    updateInning(viewInning.id, { [key]: newVal })
    await supabase.from('innings').update({ [key]: newVal }).eq('id', viewInning.id)
    // Recalc game result
    if (viewGame) {
      const updatedInnings = viewGame.innings.map(i =>
        i.id === viewInning.id ? { ...i, [key]: newVal } : i)
      const gr = gameResult(updatedInnings)
      await supabase.from('games').update({ result: gr }).eq('id', viewGame.id)
      updateGame(viewGame.id, { result: gr })
    }
  }

  async function handleSaveDefenseTask(cat: 'mind' | 'spirit' | 'body', val: string) {
    if (!viewInning) return
    const key = `${cat}_task` as 'mind_task' | 'spirit_task' | 'body_task'
    updateInning(viewInning.id, { [key]: val })
    await supabase.from('innings').update({ [key]: val }).eq('id', viewInning.id)
  }

  async function handleSetUsername(username: string) {
    if (!user) return
    setProfile(prev => prev ? { ...prev, username } : prev)
    await supabase.from('profiles').update({ username }).eq('id', user.id)
    showToast(`✅ Username set to @${username}`)
  }

  async function handleSaveDefaultTask(cat: 'mind' | 'spirit' | 'body') {
    if (!viewInning || !user) return
    const taskKey    = `${cat}_task`    as 'mind_task' | 'spirit_task' | 'body_task'
    const defaultKey = `default_${cat}_task` as 'default_mind_task' | 'default_spirit_task' | 'default_body_task'
    const val = viewInning[taskKey]
    setProfile(prev => prev ? { ...prev, [defaultKey]: val } : prev)
    await supabase.from('profiles').update({ [defaultKey]: val }).eq('id', user.id)
    showToast(`📌 Saved as your default ${cat} task!`)
  }

  // ===== OFFENSE ACTIONS =====
  async function handleAddGoal() {
    if (!viewInning || !user) return
    const sortOrder = viewInning.offense_goals.length
    const { data: goal } = await supabase
      .from('offense_goals')
      .insert({
        id: 'r_' + Date.now(), user_id: user.id, inning_id: viewInning.id,
        goal: '', completed: false, hit_type: 'single', sort_order: sortOrder,
      })
      .select().single()
    if (goal) addGoal(viewInning.id, goal)
  }

  async function handleSaveGoalText(goalId: string, val: string) {
    if (!viewInning) return
    patchGoal(viewInning.id, goalId, { goal: val })
    await supabase.from('offense_goals').update({ goal: val }).eq('id', goalId)
  }

  async function handleToggleGoal(goalId: string) {
    if (!viewInning) return
    const g = viewInning.offense_goals.find(og => og.id === goalId)
    if (!g) return
    const newVal = !g.completed
    patchGoal(viewInning.id, goalId, { completed: newVal })
    await supabase.from('offense_goals').update({ completed: newVal }).eq('id', goalId)
  }

  async function handleSetHitType(goalId: string, type: HitType) {
    if (!viewInning) return
    patchGoal(viewInning.id, goalId, { hit_type: type })
    await supabase.from('offense_goals').update({ hit_type: type }).eq('id', goalId)
  }

  async function handleDeleteGoal(goalId: string) {
    if (!viewInning) return
    removeGoal(viewInning.id, goalId)
    await supabase.from('offense_goals').delete().eq('id', goalId)
  }

  async function handleSaveTemplates() {
    if (!viewInning || !user) return
    const texts = viewInning.offense_goals.map(g => g.goal.trim()).filter(Boolean)
    const json  = JSON.stringify(texts)
    setProfile(prev => prev ? { ...prev, default_offense_goals: json } : prev)
    await supabase.from('profiles').update({ default_offense_goals: json }).eq('id', user.id)
    showToast(`📌 Saved ${texts.length} goal${texts.length !== 1 ? 's' : ''} as templates!`)
  }

  async function handleLoadTemplates() {
    if (!viewInning || !user) return
    const templates: string[] = JSON.parse(profile?.default_offense_goals ?? '[]')
    if (templates.length === 0) return
    const inserts = templates.map((text, idx) => ({
      id: 'r_' + Date.now() + '_' + idx,
      user_id: user.id,
      inning_id: viewInning.id,
      goal: text,
      completed: false,
      hit_type: 'single' as const,
      sort_order: viewInning.offense_goals.length + idx,
    }))
    const { data: inserted } = await supabase.from('offense_goals').insert(inserts).select()
    if (inserted) {
      inserted.forEach((g: typeof inserts[0]) => addGoal(viewInning.id, g))
    }
  }

  async function handleAdjustTarget(delta: number) {
    if (!viewInning || viewInning.status === 'CLOSED') return
    const next = Math.max(1, Math.min(15, viewInning.target_goals + delta))
    updateInning(viewInning.id, { target_goals: next })
    await supabase.from('innings').update({ target_goals: next }).eq('id', viewInning.id)
  }

  async function handleCloseInning() {
    if (!viewInning) return
    const outs      = countOuts(viewInning)
    const runs      = simulateRuns(viewInning.offense_goals)
    const result    = (outs === 3 ? (runs > 0 ? 'WIN' : 'TIE') : 'LOSS') as GameResult
    const isUpdate  = viewInning.status === 'CLOSED'

    const dbUpdates = isUpdate
      ? { result }
      : { status: 'CLOSED' as Status, closed_at: new Date().toISOString(), result }

    updateInning(viewInning.id, dbUpdates)
    await supabase.from('innings').update(dbUpdates).eq('id', viewInning.id)

    if (viewGame) {
      const updatedInnings = viewGame.innings.map(i =>
        i.id === viewInning.id ? { ...i, ...dbUpdates } : i)
      const gr = gameResult(updatedInnings)
      await supabase.from('games').update({ result: gr }).eq('id', viewGame.id)
      updateGame(viewGame.id, { result: gr })
    }

    if (result === 'WIN' && !isUpdate) {
      setShowWinCelebration(true)
    } else if (result === 'WIN') {
      showToast('🏆 Inning updated — still a WIN!')
    } else if (result === 'TIE') {
      showToast('🤝 Tie inning — all outs, but no runs scored!')
    } else {
      showToast(isUpdate ? '✅ Inning updated!' : '💪 Inning closed. Get \'em tomorrow!')
    }
  }

  // ===== REFLECTION =====
  async function handleSaveReflection(val: string) {
    if (!viewInning) return
    updateInning(viewInning.id, { reflection: val })
    await supabase.from('innings').update({ reflection: val }).eq('id', viewInning.id)
  }

  async function handleSaveFutureGoals(val: string) {
    if (!viewInning) return
    updateInning(viewInning.id, { future_goals: val })
    await supabase.from('innings').update({ future_goals: val }).eq('id', viewInning.id)
  }

  // ===== SEASON GOAL ACTIONS =====
  async function handleAddSeasonGoal() {
    if (!season || !user) return
    const sortOrder = season.season_goals.length
    const { data: goal } = await supabase
      .from('season_goals')
      .insert({
        id: 'sg_' + Date.now(), user_id: user.id, season_id: season.id,
        text: '', completed: false, sort_order: sortOrder,
      })
      .select().single()
    if (goal) setSeason(prev => prev ? { ...prev, season_goals: [...prev.season_goals, goal] } : prev)
  }

  async function handleSaveSeasonGoal(goalId: string, text: string) {
    patchSeasonGoal(goalId, { text })
    await supabase.from('season_goals').update({ text }).eq('id', goalId)
  }

  async function handleToggleSeasonGoal(goalId: string) {
    const g = season?.season_goals.find(sg => sg.id === goalId)
    if (!g) return
    const completed = !g.completed
    patchSeasonGoal(goalId, { completed })
    await supabase.from('season_goals').update({ completed }).eq('id', goalId)
  }

  async function handleDeleteSeasonGoal(goalId: string) {
    setSeason(prev => prev ? { ...prev, season_goals: prev.season_goals.filter(g => g.id !== goalId) } : prev)
    await supabase.from('season_goals').delete().eq('id', goalId)
  }

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <span className="text-6xl block mb-4 animate-bounce-slow">🥎</span>
          <p className="text-brand-navy font-bold text-lg">Loading your season…</p>
        </div>
      </div>
    )
  }

  if (showPastSeasons) {
    return (
      <PastSeasons
        userId={user!.id}
        sport={profile?.sport ?? 'softball'}
        onBack={() => setShowPastSeasons(false)}
      />
    )
  }

  if (recapSeason) {
    return (
      <SeasonRecap
        season={recapSeason}
        sport={profile?.sport ?? 'softball'}
        onStartNew={() => setRecapSeason(null)}
      />
    )
  }

  if (!season) {
    return (
      <SeasonGate
        sport={profile?.sport ?? 'softball'}
        displayName={profile?.display_name ?? user?.user_metadata?.full_name ?? 'Player'}
        onStart={handleStartSeason}
        onSignOut={handleSignOut}
      />
    )
  }

  const record       = getSeasonRecord()
  const streak       = currentStreak(season.games)
  const achievements = computeAchievements(season)

  // Weekly wrap-up: show on the first day of a new week when last week had activity
  const currentWeekStart = getWeekStart(todayStr)
  const prevWeekGame = (() => {
    if (vDate !== todayStr) return null  // only show on today's view
    const prevWeekStart = (() => {
      const d = new Date(currentWeekStart + 'T12:00:00')
      d.setDate(d.getDate() - 7)
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    })()
    const g = season.games.find(g => g.week_start === prevWeekStart)
    return g && g.innings.some(i => i.status === 'CLOSED') ? g : null
  })()
  const sport       = profile?.sport ?? 'softball'
  const sportEmoji  = sport === 'baseball' ? '⚾' : '🥎'
  const isOther     = viewDate && viewDate !== todayStr
  const isClosed    = viewInning?.status === 'CLOSED'
  const closedResult = viewInning ? inningResult(viewInning) : null
  const quote       = getDailyQuote()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <AppHeader
        record={record}
        streak={streak}
        sport={sport}
        profile={profile}
        onPastSeasons={() => setShowPastSeasons(true)}
        onEndSeason={handleEndSeason}
        onSignOut={handleSignOut}
      />

      <div className="max-w-2xl mx-auto px-4 pb-20 pt-4">
        {prevWeekGame && (
          <WeeklyWrapUp
            game={prevWeekGame}
            weekStart={currentWeekStart}
            sport={sport}
          />
        )}

        <Scoreboard
          games={season.games}
          todayStr={todayStr}
          viewDate={vDate}
          seasonStartDate={season.start_date}
          onViewDate={handleViewDate}
        />

        {isOther && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between animate-fade-in">
            <span className="text-amber-800 text-sm font-semibold">
              {viewDate! < todayStr ? '📅' : '🔮'}&nbsp;
              Viewing {viewDate} — {viewDate! < todayStr ? 'editing past inning' : 'setting up future inning'}
            </span>
            <button
              onClick={() => setViewDate(null)}
              className="text-amber-700 text-sm font-bold hover:text-amber-900 ml-3 flex-shrink-0"
            >
              ← Today
            </button>
          </div>
        )}

        {!viewInning ? (
          <div className="text-center py-16 text-slate-400">
            <span className="text-4xl block mb-3">📅</span>
            <p>No inning for this day yet.</p>
            <button
              onClick={() => handleViewDate(vDate)}
              className="mt-4 bg-brand-orange text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-brand-orange-dark transition-colors"
            >
              Open This Day
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            {isClosed && closedResult && viewInning && (
              <div className={`rounded-xl px-5 py-4 font-bold text-center text-sm ${
                closedResult === 'WIN'  ? 'bg-green-50  border border-green-200  text-green-800'  :
                closedResult === 'TIE'  ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                                          'bg-red-50    border border-red-200    text-red-800'
              }`}>
                {closedResult === 'WIN'  ? '🏆 Inning WIN! All 3 outs + runs scored — you crushed it!' :
                 closedResult === 'TIE'  ? '🤝 Inning TIE — 3 outs but no runs. Edit to change the result.' :
                                           `😤 Inning closed — ${countOuts(viewInning)}/3 outs. Edit to change the result.`}
              </div>
            )}

            <SeasonGoals
              goals={season.season_goals}
              onAdd={handleAddSeasonGoal}
              onSave={handleSaveSeasonGoal}
              onToggle={handleToggleSeasonGoal}
              onDelete={handleDeleteSeasonGoal}
            />

            <Achievements achievements={achievements} />

            <SeasonTrends games={season.games} />

            <FriendComparison
              myUsername={profile?.username ?? null}
              myStats={{
                gameWins:      record.wins,
                gameLosses:    record.losses,
                inningsWon:    season.games.flatMap(g => g.innings).filter(i => i.status === 'CLOSED' && inningResult(i) === 'WIN').length,
                inningsPlayed: season.games.flatMap(g => g.innings).filter(i => i.status === 'CLOSED').length,
              }}
              onSetUsername={handleSetUsername}
            />

            <DailyQuote quote={quote} />

            <DefenseSection
              inning={viewInning}
              defaultTasks={{
                mind:   profile?.default_mind_task   ?? '',
                spirit: profile?.default_spirit_task ?? '',
                body:   profile?.default_body_task   ?? '',
              }}
              onToggle={handleToggleDefense}
              onSaveTask={handleSaveDefenseTask}
              onSaveDefault={handleSaveDefaultTask}
            />

            <OffenseSection
              inning={viewInning}
              sportEmoji={sportEmoji}
              templates={JSON.parse(profile?.default_offense_goals ?? '[]')}
              onAddGoal={handleAddGoal}
              onSaveGoalText={handleSaveGoalText}
              onToggleGoal={handleToggleGoal}
              onSetHitType={handleSetHitType}
              onDeleteGoal={handleDeleteGoal}
              onCloseInning={handleCloseInning}
              onLoadTemplates={handleLoadTemplates}
              onSaveTemplates={handleSaveTemplates}
            />

            <EndOfDay
              inning={viewInning}
              onSaveReflection={handleSaveReflection}
              onSaveFutureGoals={handleSaveFutureGoals}
            />
          </div>
        )}
      </div>

      {showWinCelebration && (
        <WinCelebration onDismiss={() => setShowWinCelebration(false)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-brand-navy text-white px-6 py-3 rounded-full font-semibold text-sm shadow-2xl z-50 animate-fade-in whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
