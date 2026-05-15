'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile, FullSeason, FullGame, FullInning, OffenseGoal, SeasonGoal, Sport, HitType, GameResult, Status } from '@/types'
import {
  today, getWeekStart, getWeekEnd, inningNumber, displayDate, toDateKey, getNextDate,
  countOuts, simulateRuns, inningResult, gameResult, getDailyQuote, getDailyVerse, currentStreak, getPrevDate,
} from '@/lib/game-logic'
import AppHeader      from '@/components/AppHeader'
import StreakBanner   from '@/components/StreakBanner'
import DayContext     from '@/components/DayContext'
import PreSeason      from '@/components/PreSeason'
import TeamSettings   from '@/components/TeamSettings'
import SeasonRecap    from '@/components/SeasonRecap'
import PastSeasons    from '@/components/PastSeasons'
import WinCelebration from '@/components/WinCelebration'
import Scoreboard     from '@/components/Scoreboard'
import SeasonGoals    from '@/components/SeasonGoals'
import DailyQuote     from '@/components/DailyQuote'
import DefenseSection from '@/components/DefenseSection'
import OffenseSection from '@/components/OffenseSection'
import EndOfDay       from '@/components/EndOfDay'
import WeeklyWrapUp   from '@/components/WeeklyWrapUp'
import ShareCard      from '@/components/ShareCard'
import ShareSheet     from '@/components/ShareSheet'
import SocialPage     from '@/components/SocialPage'
import StatsPage      from '@/components/StatsPage'
import BottomNav        from '@/components/BottomNav'
import SeasonCeremony  from '@/components/SeasonCeremony'
import WelcomeBack     from '@/components/WelcomeBack'
import UndoToast, { type UndoAction } from '@/components/UndoToast'

function safeParseGoals(json: string | null | undefined): string[] {
  try { return JSON.parse(json ?? '[]') } catch { return [] }
}

export default function AppPage() {
  const [user,      setUser]      = useState<User | null>(null)
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [season,    setSeason]    = useState<FullSeason | null>(null)
  const [viewDate,  setViewDate]  = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState<string | null>(null)
  const saveCountRef              = useRef(0)
  const [recapSeason,        setRecapSeason]        = useState<FullSeason | null>(null)
  const [showPastSeasons,    setShowPastSeasons]    = useState(false)
  const [showWinCelebration, setShowWinCelebration] = useState(false)
  const [showShareCard,      setShowShareCard]      = useState(false)
  const [showTeamSettings,   setShowTeamSettings]   = useState(false)
  const [showShareSheet,     setShowShareSheet]     = useState(false)
  const [shareContext,       setShareContext]        = useState<'inning' | 'season'>('season')
  const [showSeasonCeremony, setShowSeasonCeremony] = useState(false)
  const [welcomeBack,        setWelcomeBack]        = useState<{ days: number; wins: number; losses: number; ties: number } | null>(null)
  const [activeTab,          setActiveTab]          = useState<'today' | 'stats' | 'social'>('today')
  const [undoAction,         setUndoAction]         = useState<UndoAction | null>(null)
  const undoIdRef             = useRef(0)
  const touchStartX           = useRef(0)
  const touchStartY           = useRef(0)
  const viewDateInProgressRef = useRef(false)
  const pendingViewDateRef    = useRef<string | null>(null)
  const toastTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const todayStr = today()
  const vDateEarly = viewDate || todayStr

  // Must be above all early returns to satisfy Rules of Hooks
  const recentGoals = useMemo(() => {
    if (!season) return []
    const seen = new Set<string>()
    const result: string[] = []
    const pastInnings = season.games
      .flatMap(g => g.innings)
      .filter(i => i.date < vDateEarly)
      .reverse()
    for (const i of pastInnings) {
      for (const og of i.offense_goals) {
        const t = og.goal.trim()
        if (t && !seen.has(t)) { seen.add(t); result.push(t) }
        if (result.length >= 20) return result
      }
    }
    return result
  }, [season, vDateEarly])

  // ===== TOAST =====
  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(null)
  }, [])

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    const duration = msg.startsWith('❌') ? 8000 : 3000
    toastTimerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  // ===== SAVE STATE =====
  function beginSave() {
    saveCountRef.current++
    if (saveCountRef.current === 1) setSaving(true)
  }
  function endSave(error?: { message: string } | null) {
    saveCountRef.current = Math.max(0, saveCountRef.current - 1)
    if (saveCountRef.current === 0) setSaving(false)
    if (error) showToast(`❌ Save failed — check your connection`)
  }

  // ===== UNDO =====
  function registerUndo(label: string, revert: () => void, dbRevert: () => Promise<void>) {
    undoIdRef.current += 1
    setUndoAction({ id: undoIdRef.current, label, revert, dbRevert })
  }

  // ===== SWIPE =====
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    const newDate = dx < 0 ? getNextDate(vDateEarly) : getPrevDate(vDateEarly)
    if (!season || newDate < season.start_date) return
    const maxDate = season.end_date ?? getWeekEnd(getWeekStart(todayStr))
    if (newDate > maxDate) return
    handleViewDate(newDate)
  }

  // ===== LOAD =====
  const loadData = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) { router.push('/login'); return }
    setUser(user)

    const { data: prof, error: profError } = await supabase
      .from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (profError) {
      showToast(`❌ Couldn't load your profile — please refresh`)
    }
    setProfile(prof)

    const { data: raw, error: seasonError } = await supabase
      .from('seasons')
      .select('*, season_goals(*), games(*, innings(*, offense_goals(*)))')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (seasonError) {
      showToast(`❌ Couldn't load your season — please refresh`)
      setLoading(false)
      return
    }

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

      // Auto-close any IN_PROGRESS innings from before today (midnight rule)
      const now = new Date().toISOString()
      for (const game of raw.games) {
        let gameChanged = false
        for (const inning of game.innings) {
          if (inning.status !== 'IN_PROGRESS') continue
          if (inning.date >= today()) continue  // leave today + future alone
          const outs = countOuts(inning)
          const runs = simulateRuns(inning.offense_goals)
          const result: GameResult = outs < 3 ? 'LOSS' : runs > 0 ? 'WIN' : 'TIE'
          await supabase.from('innings').update({ status: 'CLOSED', result, closed_at: now }).eq('id', inning.id)
          inning.status = 'CLOSED'
          inning.result = result
          inning.closed_at = now
          gameChanged = true
        }
        if (gameChanged) {
          const newResult = gameResult(game.innings)
          await supabase.from('games').update({ result: newResult }).eq('id', game.id)
          game.result = newResult
        }
      }
    }
    setSeason(raw)
    setLoading(false)

    // ── Welcome back detection ─────────────────────────────────────────────
    try {
      const STORAGE_KEY  = 'wti_last_visit'
      const lastVisitStr = localStorage.getItem(STORAGE_KEY)
      const todayDate    = today()
      localStorage.setItem(STORAGE_KEY, todayDate)

      if (lastVisitStr && lastVisitStr < todayDate && raw) {
        const daysDiff = Math.round(
          (new Date(todayDate + 'T12:00:00').getTime() - new Date(lastVisitStr + 'T12:00:00').getTime())
          / 86_400_000
        )
        if (daysDiff >= 3) {
          // Count innings auto-closed during absence
          const missedInnings = raw.games
            .flatMap((g: FullGame) => g.innings)
            .filter((i: FullInning) => i.date > lastVisitStr && i.date < todayDate && i.status === 'CLOSED')
          const wins   = missedInnings.filter((i: FullInning) => i.result === 'WIN').length
          const losses = missedInnings.filter((i: FullInning) => i.result === 'LOSS').length
          const ties   = missedInnings.filter((i: FullInning) => i.result === 'TIE').length
          setWelcomeBack({ days: daysDiff, wins, losses, ties })
        }
      }
    } catch { /* localStorage may be unavailable */ }
  }, [])

  useEffect(() => { loadData() }, [])

  // ===== REALTIME SYNC =====
  // Re-fetch whenever another device changes innings or goals
  useEffect(() => {
    if (!user) return

    let timer: ReturnType<typeof setTimeout> | null = null
    function scheduleReload() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (saveCountRef.current === 0) loadData()
      }, 600)
    }

    const channel = supabase
      .channel('realtime-user-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'innings' },        scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offense_goals' },  scheduleReload)
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

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

  // ===== TEAM ACTIONS =====
  async function handleSaveTeam(teamName: string, mascot: string, autoCarryTasks: boolean, discoverable: boolean, publicEmail: string) {
    if (!user) return
    const updates = {
      team_name:        teamName || null,
      mascot,
      auto_carry_tasks: autoCarryTasks,
      is_discoverable:  discoverable,
      public_email:     publicEmail || null,
    }
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
    if (error) {
      showToast(`❌ Save failed: ${error.message}`)
    } else {
      showToast(`🏟️ Team updated!`)
    }
  }

  // ===== SEASON ACTIONS =====
  async function handleStartSeason(sport: Sport, initialGoals: string[] = [], opts?: {
    teamName: string; mascot: string; lengthWeeks: number
    successDefinition: string; obstacle: string; dailyBibleVerse: boolean; autoCarryTasks: boolean
  }) {
    if (!user) return
    const t   = todayStr
    const sid = 's_' + t + '_' + Date.now()
    const ws  = getWeekStart(t)
    const we  = getWeekEnd(ws)
    const gid = 'g_' + ws + '_' + Date.now()
    const iid = 'i_' + t  + '_' + Date.now()

    await supabase.from('seasons').update({ is_current: false }).eq('user_id', user.id).eq('is_current', true)
    await supabase.from('seasons').insert({
      id: sid, user_id: user.id, start_date: t, is_current: true,
      ...(opts ? {
        success_definition: opts.successDefinition || null,
        obstacle:           opts.obstacle || null,
        length_weeks:       opts.lengthWeeks,
      } : {}),
    })
    await supabase.from('profiles').update({
      sport,
      ...(opts ? {
        team_name:          opts.teamName || null,
        mascot:             opts.mascot,
        daily_bible_verse:  opts.dailyBibleVerse,
        auto_carry_tasks:   opts.autoCarryTasks,
      } : {}),
    }).eq('id', user.id)
    await supabase.from('games').insert({ id: gid, user_id: user.id, season_id: sid, week_start: ws, week_end: we })
    await supabase.from('innings').insert({
      id: iid, user_id: user.id, game_id: gid, date: t,
      inning_number: inningNumber(t), target_goals: 5,
      mind_task:   profile?.default_mind_task   ?? '',
      mind_completed: false,
      spirit_task: profile?.default_spirit_task ?? '',
      spirit_completed: false,
      body_task:   profile?.default_body_task   ?? '',
      body_completed: false,
      reflection: '', future_goals: '',
      status: 'IN_PROGRESS', result: 'IN_PROGRESS', is_rain_delay: false, pinch_hit_used: false,
    })
    if (initialGoals.length > 0) {
      await supabase.from('season_goals').insert(
        initialGoals.map((text, idx) => ({
          id: 'sg_' + Date.now() + '_' + idx,
          user_id: user.id, season_id: sid,
          text, completed: false, sort_order: idx,
        }))
      )
    }
    setProfile(prev => prev ? {
      ...prev, sport,
      ...(opts ? {
        team_name: opts.teamName || null,
        mascot: opts.mascot,
        daily_bible_verse: opts.dailyBibleVerse,
        auto_carry_tasks: opts.autoCarryTasks,
      } : {}),
    } : prev)
    await loadData()
    setShowSeasonCeremony(true)
  }

  async function handleEndSeason() {
    if (!season) return
    if (!confirm('End this season? Your record will be saved.')) return

    // Finalize any still-open innings so the recap shows accurate results
    const now = new Date().toISOString()
    const updatedGames = await Promise.all(season.games.map(async game => {
      const updatedInnings = game.innings.map(inning => {
        if (inning.status !== 'IN_PROGRESS') return inning
        const outs = countOuts(inning)
        const runs = simulateRuns(inning.offense_goals)
        const result = (outs < 3 ? 'LOSS' : runs > 0 ? 'WIN' : 'TIE') as GameResult
        return { ...inning, status: 'CLOSED' as Status, result, closed_at: now }
      })
      for (const inning of game.innings) {
        if (inning.status !== 'IN_PROGRESS') continue
        const outs = countOuts(inning)
        const runs = simulateRuns(inning.offense_goals)
        const result = (outs < 3 ? 'LOSS' : runs > 0 ? 'WIN' : 'TIE') as GameResult
        await supabase.from('innings').update({ status: 'CLOSED', result, closed_at: now }).eq('id', inning.id)
      }
      const gr = gameResult(updatedInnings)
      if (gr !== game.result) {
        await supabase.from('games').update({ result: gr }).eq('id', game.id)
      }
      return { ...game, innings: updatedInnings, result: gr }
    }))

    await supabase.from('seasons').update({ end_date: todayStr, is_current: false }).eq('id', season.id)
    setRecapSeason({ ...season, games: updatedGames, end_date: todayStr })
    setSeason(null)
  }

  async function handleClearAllData() {
    if (!user) return
    if (!confirm('This will permanently delete ALL your seasons, games, innings, and stats. This cannot be undone.')) return
    if (!confirm('Are you absolutely sure? Every record will be gone forever.')) return
    await supabase.from('seasons').delete().eq('user_id', user.id)
    setSeason(null)
    setRecapSeason(null)
    setViewDate(null)
    showToast('🗑️ All data cleared — ready for a fresh start!')
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ===== VIEW DATE =====
  async function handleViewDate(date: string) {
    if (!season || !user) return
    if (season.end_date && date > season.end_date) return
    // If a DB operation is already in flight, queue this date and update UI immediately
    if (viewDateInProgressRef.current) {
      pendingViewDateRef.current = date
      setViewDate(date)
      return
    }
    viewDateInProgressRef.current = true
    pendingViewDateRef.current = null
    setViewDate(date)

    // Ensure game exists for this week
    let game = season.games.find(g => g.week_start <= date && g.week_end >= date)
    if (!game) {
      const ws  = getWeekStart(date)
      const we  = getWeekEnd(ws)
      const gid = 'g_' + ws + '_' + Date.now()
      const { data: newGame, error: gameError } = await supabase
        .from('games')
        .insert({ id: gid, user_id: user.id, season_id: season.id, week_start: ws, week_end: we })
        .select().single()
      if (!newGame || gameError) {
        showToast('❌ Failed to load this week. Please try again.')
        viewDateInProgressRef.current = false
        return
      }
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
          status: 'IN_PROGRESS', result: 'IN_PROGRESS', is_rain_delay: false, pinch_hit_used: false,
        })
        .select().single()
      if (!newInning) return
      let offenseGoals: OffenseGoal[] = []

      const prevDate   = getPrevDate(date)
      const prevInning = season.games.flatMap(g => g.innings).find(i => i.date === prevDate)

      if (profile?.auto_carry_tasks && prevInning) {
        // Carry forward incomplete offense goals from the previous day
        const incomplete = prevInning.offense_goals.filter(og => !og.completed && og.goal.trim())
        if (incomplete.length > 0) {
          const inserts = incomplete.map((og, idx) => ({
            id: 'r_' + Date.now() + '_c' + idx,
            user_id: user.id,
            inning_id: iid,
            goal: og.goal,
            completed: false,
            hit_type: og.hit_type,
            sort_order: idx,
          }))
          const { data: inserted } = await supabase.from('offense_goals').insert(inserts).select()
          if (inserted) offenseGoals = inserted
        }
      } else if (prevInning?.future_goals?.trim()) {
        // Fall back to manual future_goals text
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
    viewDateInProgressRef.current = false
    // If the user swiped to a different date while we were loading, process it now
    const pending = pendingViewDateRef.current
    if (pending && pending !== date) {
      pendingViewDateRef.current = null
      handleViewDate(pending)
    }
  }

  // ===== DEFENSE ACTIONS =====
  async function handleToggleDefense(cat: 'mind' | 'spirit' | 'body') {
    if (!viewInning) return
    const key     = `${cat}_completed` as 'mind_completed' | 'spirit_completed' | 'body_completed'
    const prevVal = viewInning[key]
    const newVal  = !prevVal
    const inningId = viewInning.id
    const capturedGame = viewGame

    updateInning(inningId, { [key]: newVal })
    beginSave()
    const { error: e1 } = await supabase.from('innings').update({ [key]: newVal }).eq('id', inningId)
    if (capturedGame) {
      const updatedInnings = capturedGame.innings.map(i => i.id === inningId ? { ...i, [key]: newVal } : i)
      const gr = gameResult(updatedInnings)
      const { error: e2 } = await supabase.from('games').update({ result: gr }).eq('id', capturedGame.id)
      if (!e1 && !e2) updateGame(capturedGame.id, { result: gr })
    }
    endSave(e1)

    registerUndo(
      `${cat.charAt(0).toUpperCase() + cat.slice(1)} task ${newVal ? 'checked' : 'unchecked'}`,
      () => {
        updateInning(inningId, { [key]: prevVal })
        if (capturedGame) {
          const reverted = capturedGame.innings.map(i => i.id === inningId ? { ...i, [key]: prevVal } : i)
          updateGame(capturedGame.id, { result: gameResult(reverted) })
        }
      },
      async () => {
        await supabase.from('innings').update({ [key]: prevVal }).eq('id', inningId)
        if (capturedGame) {
          const reverted = capturedGame.innings.map(i => i.id === inningId ? { ...i, [key]: prevVal } : i)
          await supabase.from('games').update({ result: gameResult(reverted) }).eq('id', capturedGame.id)
        }
      }
    )
  }

  async function handleSaveDefenseTask(cat: 'mind' | 'spirit' | 'body', val: string) {
    if (!viewInning) return
    const key = `${cat}_task` as 'mind_task' | 'spirit_task' | 'body_task'
    updateInning(viewInning.id, { [key]: val })
    const { error } = await supabase.from('innings').update({ [key]: val }).eq('id', viewInning.id)
    if (error) showToast(`❌ Couldn't save task — check your connection`)
  }

  async function handleSetUsername(username: string) {
    if (!user) return
    const { error } = await supabase.from('profiles').update({ username }).eq('id', user.id)
    if (error) {
      if (error.code === '23505') {
        showToast(`❌ @${username} is already taken — try another!`)
      } else {
        showToast(`❌ Couldn't save username: ${error.message}`)
      }
      return
    }
    setProfile(prev => prev ? { ...prev, username } : prev)
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
  async function handleAddGoal(text = '') {
    if (!viewInning || !user) return
    const sortOrder = viewInning.offense_goals.length
    beginSave()
    const { data: goal, error } = await supabase
      .from('offense_goals')
      .insert({
        id: 'r_' + Date.now(), user_id: user.id, inning_id: viewInning.id,
        goal: text, completed: false, hit_type: 'single', sort_order: sortOrder,
      })
      .select().single()
    endSave(error)
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
    const prevVal  = g.completed
    const newVal   = !prevVal
    const inningId = viewInning.id

    patchGoal(inningId, goalId, { completed: newVal })
    beginSave()
    const { error } = await supabase.from('offense_goals').update({ completed: newVal }).eq('id', goalId)
    endSave(error)

    registerUndo(
      `Goal ${newVal ? 'completed' : 'uncompleted'}`,
      () => patchGoal(inningId, goalId, { completed: prevVal }),
      async () => { await supabase.from('offense_goals').update({ completed: prevVal }).eq('id', goalId) }
    )
  }

  async function handleSetHitType(goalId: string, type: HitType) {
    if (!viewInning) return
    patchGoal(viewInning.id, goalId, { hit_type: type })
    beginSave()
    const { error } = await supabase.from('offense_goals').update({ hit_type: type }).eq('id', goalId)
    endSave(error)
  }

  async function handleDeleteGoal(goalId: string) {
    if (!viewInning) return
    removeGoal(viewInning.id, goalId)
    beginSave()
    const { error } = await supabase.from('offense_goals').delete().eq('id', goalId)
    endSave(error)
  }

  async function handleRainDelay() {
    if (!viewInning || !viewGame) return
    if (!confirm('Use your Rain Delay? This skips today without a loss — 1 per week.')) return
    const updates = { status: 'CLOSED' as Status, is_rain_delay: true, result: 'IN_PROGRESS' as GameResult, closed_at: new Date().toISOString() }
    updateInning(viewInning.id, updates)
    await supabase.from('innings').update(updates).eq('id', viewInning.id)
    const updatedInnings = viewGame.innings.map(i => i.id === viewInning.id ? { ...i, ...updates } : i)
    const gr = gameResult(updatedInnings)
    await supabase.from('games').update({ result: gr }).eq('id', viewGame.id)
    updateGame(viewGame.id, { result: gr })
    showToast('☔ Rain Delay used — day skipped, no loss!')
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
    const templates: string[] = safeParseGoals(profile?.default_offense_goals)
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
    const inningId  = viewInning.id
    const capturedGame = viewGame

    const dbUpdates = isUpdate
      ? { result }
      : { status: 'CLOSED' as Status, closed_at: new Date().toISOString(), result }

    updateInning(viewInning.id, dbUpdates)
    beginSave()
    const { error: innErr } = await supabase.from('innings').update(dbUpdates).eq('id', viewInning.id)
    if (viewGame) {
      const updatedInnings = viewGame.innings.map(i =>
        i.id === viewInning.id ? { ...i, ...dbUpdates } : i)
      const gr = gameResult(updatedInnings)
      const { error: gameErr } = await supabase.from('games').update({ result: gr }).eq('id', viewGame.id)
      if (!gameErr) updateGame(viewGame.id, { result: gr })
    }
    endSave(innErr)

    if (!isUpdate) {
      registerUndo(
        `Inning ${result === 'WIN' ? 'won 🏆' : result === 'TIE' ? 'tied 🤝' : 'closed'}`,
        () => {
          updateInning(inningId, { status: 'IN_PROGRESS', closed_at: null, result: 'IN_PROGRESS' })
          if (capturedGame) {
            const reverted = capturedGame.innings.map(i => i.id === inningId ? { ...i, status: 'IN_PROGRESS' as Status, closed_at: null, result: 'IN_PROGRESS' as GameResult } : i)
            updateGame(capturedGame.id, { result: gameResult(reverted) })
          }
          if (result === 'WIN') setShowWinCelebration(false)
        },
        async () => {
          await supabase.from('innings').update({ status: 'IN_PROGRESS', closed_at: null, result: 'IN_PROGRESS' }).eq('id', inningId)
          if (capturedGame) {
            const reverted = capturedGame.innings.map(i => i.id === inningId ? { ...i, status: 'IN_PROGRESS' as Status, closed_at: null, result: 'IN_PROGRESS' as GameResult } : i)
            await supabase.from('games').update({ result: gameResult(reverted) }).eq('id', capturedGame.id)
          }
        }
      )
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

  // ===== REOPEN =====
  async function handleReopenInning() {
    if (!viewInning) return
    const inningId     = viewInning.id
    const capturedGame = viewGame
    const patch        = { status: 'IN_PROGRESS' as Status, result: 'IN_PROGRESS' as GameResult, closed_at: null }

    updateInning(inningId, patch)
    beginSave()
    const { error: innErr } = await supabase.from('innings').update(patch).eq('id', inningId)
    if (capturedGame && !innErr) {
      const updatedInnings = capturedGame.innings.map(i => i.id === inningId ? { ...i, ...patch } : i)
      const gr = gameResult(updatedInnings)
      await supabase.from('games').update({ result: gr }).eq('id', capturedGame.id)
      updateGame(capturedGame.id, { result: gr })
    }
    endSave(innErr)
    if (!innErr) showToast('📂 Inning re-opened — make your edits, then close it again')
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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
      <PreSeason
        sport={profile?.sport ?? 'softball'}
        displayName={profile?.display_name ?? user?.user_metadata?.full_name ?? 'Player'}
        onStart={(sport, goals, opts) => handleStartSeason(sport, goals, opts)}
        onSignOut={handleSignOut}
      />
    )
  }

  const record           = getSeasonRecord()
  const streak           = currentStreak(season.games)

  const allClosedInnings = season.games.flatMap(g => g.innings).filter(i => i.status === 'CLOSED' && !i.is_rain_delay)
  const inningsWon       = allClosedInnings.filter(i => inningResult(i) === 'WIN').length
  const inningsPlayed    = allClosedInnings.length

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
  const verse       = profile?.daily_bible_verse ? getDailyVerse() : null

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader
        record={record}
        streak={streak}
        sport={sport}
        profile={profile}
        onPastSeasons={() => setShowPastSeasons(true)}
        onEditTeam={() => setShowTeamSettings(true)}
        onEndSeason={handleEndSeason}
        onSignOut={handleSignOut}
      />

      {saving && (
        <div className="fixed top-[57px] inset-x-0 h-0.5 z-30 overflow-hidden">
          <div className="h-full bg-brand-orange animate-pulse" />
        </div>
      )}

      <div
        className="max-w-2xl mx-auto px-4 pb-24 pt-4"
        onTouchStart={activeTab === 'today' ? handleTouchStart : undefined}
        onTouchEnd={activeTab === 'today' ? handleTouchEnd : undefined}
      >

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <StatsPage
            season={season}
            record={record}
            profile={profile}
            inningsWon={inningsWon}
            inningsPlayed={inningsPlayed}
            onPastSeasons={() => setShowPastSeasons(true)}
            onClearData={handleClearAllData}
          />
        )}

        {activeTab === 'social' && (
          <SocialPage
            profile={profile}
            record={record}
            inningsWon={inningsWon}
            inningsPlayed={inningsPlayed}
            onShare={() => { setShareContext('season'); setShowShareSheet(true) }}
            onShareCard={() => setShowShareCard(true)}
            onSetUsername={handleSetUsername}
            onOpenSettings={() => setShowTeamSettings(true)}
          />
        )}

        {/* Today tab */}
        {activeTab === 'today' && (<>
        <StreakBanner
          streak={streak}
          todayWon={!isOther && closedResult === 'WIN'}
          isToday={!isOther}
        />

        {!isOther && (
          <DayContext
            season={season}
            todayStr={todayStr}
            sport={sport}
            inningsPlayed={inningsPlayed}
            inningsWon={inningsWon}
          />
        )}

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
              Viewing {displayDate(viewDate!)} — {viewDate! < todayStr ? 'editing past inning' : 'setting up future inning'}
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
              <div className={`rounded-xl px-5 py-4 flex items-center justify-between gap-3 ${
                closedResult === 'WIN'  ? 'bg-green-50  border border-green-200'  :
                closedResult === 'TIE'  ? 'bg-yellow-50 border border-yellow-200' :
                                          'bg-red-50    border border-red-200'
              }`}>
                <p className={`font-bold text-sm ${
                  closedResult === 'WIN' ? 'text-green-800' : closedResult === 'TIE' ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {closedResult === 'WIN'  ? '🏆 Inning WIN! All 3 outs + runs scored.' :
                   closedResult === 'TIE'  ? '🤝 Inning TIE — 3 outs but no runs.' :
                                             `😤 Inning closed — ${countOuts(viewInning)}/3 outs.`}
                </p>
                <button
                  onClick={handleReopenInning}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border border-current opacity-60 hover:opacity-100 transition-opacity"
                >
                  Re-open
                </button>
              </div>
            )}

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
              templates={safeParseGoals(profile?.default_offense_goals)}
              recentGoals={recentGoals}
              canRainDelay={!!viewGame && !viewGame.innings.some(i => i.is_rain_delay)}
              onAddGoal={() => handleAddGoal()}
              onAddGoalWithText={text => handleAddGoal(text)}
              onSaveGoalText={handleSaveGoalText}
              onToggleGoal={handleToggleGoal}
              onSetHitType={handleSetHitType}
              onDeleteGoal={handleDeleteGoal}
              onCloseInning={handleCloseInning}
              onLoadTemplates={handleLoadTemplates}
              onSaveTemplates={handleSaveTemplates}
              onRainDelay={handleRainDelay}
            />

            {verse && (
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-5 flex gap-4 items-start">
                <span className="text-2xl flex-shrink-0">✝️</span>
                <div>
                  <p className="text-white text-sm font-medium leading-relaxed italic">&ldquo;{verse.text}&rdquo;</p>
                  <p className="text-white/50 text-xs mt-1.5 font-semibold">— {verse.ref}</p>
                </div>
              </div>
            )}

            <SeasonGoals
              goals={season.season_goals}
              onAdd={handleAddSeasonGoal}
              onSave={handleSaveSeasonGoal}
              onToggle={handleToggleSeasonGoal}
              onDelete={handleDeleteSeasonGoal}
            />

            <EndOfDay
              inning={viewInning}
              onSaveReflection={handleSaveReflection}
              onSaveFutureGoals={handleSaveFutureGoals}
            />
          </div>
        )}
        </>)}
      </div>

      <BottomNav tab={activeTab} onChange={setActiveTab} />

      {undoAction && (
        <UndoToast
          action={undoAction}
          onDismiss={() => setUndoAction(null)}
        />
      )}

      {showTeamSettings && (
        <TeamSettings
          currentTeamName={profile?.team_name ?? null}
          currentMascot={profile?.mascot ?? null}
          currentAutoCarry={profile?.auto_carry_tasks ?? false}
          currentDiscoverable={profile?.is_discoverable ?? false}
          currentPublicEmail={profile?.public_email ?? null}
          onSave={handleSaveTeam}
          onClose={() => setShowTeamSettings(false)}
        />
      )}

      {showSeasonCeremony && season && (
        <SeasonCeremony season={season} onClose={() => setShowSeasonCeremony(false)} />
      )}

      {welcomeBack && (
        <WelcomeBack summary={welcomeBack} onClose={() => setWelcomeBack(null)} />
      )}

      {showWinCelebration && (
        <WinCelebration
          onDismiss={() => setShowWinCelebration(false)}
          onShare={() => { setShowWinCelebration(false); setShareContext('inning'); setShowShareSheet(true) }}
        />
      )}

      {showShareSheet && (
        <ShareSheet
          username={profile?.username ?? null}
          displayName={profile?.display_name ?? null}
          mascot={profile?.mascot ?? null}
          teamName={profile?.team_name ?? null}
          record={record}
          context={shareContext}
          onClose={() => setShowShareSheet(false)}
        />
      )}

      {showShareCard && (
        <ShareCard
          game={viewGame}
          record={record}
          streak={streak}
          sport={sport}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-fade-in flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm shadow-2xl whitespace-nowrap ${
          toast.startsWith('❌') ? 'bg-red-600 text-white' : 'bg-brand-navy text-white'
        }`}>
          <span>{toast}</span>
          <button onClick={dismissToast} className="text-white/60 hover:text-white transition-colors flex-shrink-0 ml-1" aria-label="Dismiss">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
