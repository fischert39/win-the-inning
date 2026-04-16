'use client'

import { useState, useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string
  email: string
  displayName: string
  username: string | null
  sport: string
  teamName: string | null
  joinedAt: string
  lastActive: string | null
  totalSeasons: number
  activeSeasons: number
  totalGames: number
  gamesWon: number
  gamesLost: number
  gamesTied: number
  gameWinPct: number | null
  totalInnings: number
  inningsWon: number
  inningWinPct: number | null
  rainDelayInnings: number
  pinchHitUsed: number
  totalGoals: number
  goalsCompleted: number
  goalCompPct: number | null
  singles: number
  doubles: number
  triples: number
  homers: number
  mindTotal: number
  mindCompleted: number
  mindCompPct: number | null
  spiritTotal: number
  spiritCompleted: number
  spiritCompPct: number | null
  bodyTotal: number
  bodyCompleted: number
  bodyCompPct: number | null
  bibleVerse: boolean
  autoCarry: boolean
  isDiscoverable: boolean
  pinchHitterTokens: number
}

export interface AdminStats {
  totalUsers: number
  newThisWeek: number
  newThisMonth: number
  activeThisWeek: number
  activeThisMonth: number
  totalSeasons: number
  activeSeasons: number
  totalGames: number
  gamesWon: number
  gamesLost: number
  gamesTied: number
  gamesInProgress: number
  totalInnings: number
  inningsWon: number
  rainDelayInnings: number
  pinchHitInnings: number
  totalGoals: number
  goalsCompleted: number
  singles: number
  doubles: number
  triples: number
  homers: number
  mindTotal: number
  mindCompleted: number
  spiritTotal: number
  spiritCompleted: number
  bodyTotal: number
  bodyCompleted: number
  bibleVerseUsers: number
  autoCarryUsers: number
  discoverableUsers: number
  usernameSetUsers: number
  totalTokens: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type SortKey = keyof AdminUserRow
type SortDir = 'asc' | 'desc'

function fmtPct(n: number | null) {
  return n === null ? '—' : `${n}%`
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function safePct(num: number, den: number) {
  return den === 0 ? 0 : Math.round((num / den) * 100)
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = safePct(value, total)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold tabular-nums w-14 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard({ stats, users }: { stats: AdminStats; users: AdminUserRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('joinedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search,  setSearch]  = useState('')

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.username?.toLowerCase().includes(q) ?? false) ||
      (u.teamName?.toLowerCase().includes(q) ?? false)
    )
  }, [users, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      let cmp = 0
      if (typeof av === 'string'  && typeof bv === 'string')  cmp = av.localeCompare(bv)
      if (typeof av === 'number'  && typeof bv === 'number')  cmp = av - bv
      if (typeof av === 'boolean' && typeof bv === 'boolean') cmp = (av ? 1 : 0) - (bv ? 1 : 0)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // Helper that returns a <th> element (not a component to avoid remount issues)
  function th(col: SortKey, label: string, right = false) {
    const active = sortKey === col
    return (
      <th
        key={col}
        onClick={() => handleSort(col)}
        className={[
          'px-3 py-2.5 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap',
          'transition-colors hover:bg-slate-100 border-b border-slate-200',
          right ? 'text-right' : 'text-left',
          active ? 'text-brand-orange bg-orange-50' : 'text-slate-400',
        ].join(' ')}
      >
        {label}{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </th>
    )
  }

  // Derived global numbers
  const finishedGames = stats.gamesWon + stats.gamesLost + stats.gamesTied
  const hitTotal      = stats.singles + stats.doubles + stats.triples + stats.homers
  const defTotal      = stats.mindTotal + stats.spiritTotal + stats.bodyTotal
  const defDone       = stats.mindCompleted + stats.spiritCompleted + stats.bodyCompleted

  return (
    <div className="min-h-screen bg-slate-50 pb-16">

      {/* ── Header ── */}
      <div className="bg-brand-navy text-white px-6 py-6">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-end gap-4 justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Overview</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {stats.totalUsers} registered {stats.totalUsers === 1 ? 'player' : 'players'} &nbsp;·&nbsp;
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-4 text-center text-white/60 text-xs">
            <div><p className="text-2xl font-extrabold text-white">{stats.activeThisWeek}</p><p>active this week</p></div>
            <div><p className="text-2xl font-extrabold text-brand-orange">{finishedGames > 0 ? safePct(stats.gamesWon, finishedGames) : 0}%</p><p>game win rate</p></div>
            <div><p className="text-2xl font-extrabold text-brand-green">{stats.totalInnings > 0 ? safePct(stats.inningsWon, stats.totalInnings) : 0}%</p><p>inning win rate</p></div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 mt-6 space-y-8">

        {/* ── Players ── */}
        <section>
          <SectionLabel>Players</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card label="Total Players"    value={stats.totalUsers} />
            <Card label="New This Week"    value={stats.newThisWeek}   accent="text-brand-green" />
            <Card label="New This Month"   value={stats.newThisMonth}  accent="text-brand-teal" />
            <Card label="Active (7 days)"  value={stats.activeThisWeek}  sub="logged an inning" accent="text-brand-orange" />
            <Card label="Active (30 days)" value={stats.activeThisMonth} sub="logged an inning" accent="text-brand-purple" />
          </div>
        </section>

        {/* ── Activity ── */}
        <section>
          <SectionLabel>Activity</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card label="Total Seasons"   value={stats.totalSeasons}   sub={`${stats.activeSeasons} active`} />
            <Card label="Games Played"    value={stats.totalGames}     sub={`${stats.gamesInProgress} in progress`} />
            <Card label="Innings Closed"  value={stats.totalInnings}   sub={`${stats.rainDelayInnings} rain delays`} />
            <Card label="Goals Set"       value={stats.totalGoals}     />
            <Card label="Goals Completed" value={stats.goalsCompleted} sub={`${safePct(stats.goalsCompleted, stats.totalGoals)}% completion`} accent="text-brand-green" />
            <Card label="Pinch Hits Used" value={stats.pinchHitInnings} />
          </div>
        </section>

        {/* ── Win rates + Defense + Hits ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Win Rates */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
            <SectionLabel>Win Rates</SectionLabel>
            <div className="space-y-4">
              <RateBlock
                label="Game Win Rate"
                value={`${safePct(stats.gamesWon, finishedGames)}%`}
                sub={`${stats.gamesWon}W · ${stats.gamesLost}L · ${stats.gamesTied}T`}
                color="#2DC653"
              />
              <RateBlock
                label="Inning Win Rate"
                value={`${safePct(stats.inningsWon, stats.totalInnings)}%`}
                sub={`${stats.inningsWon} won of ${stats.totalInnings} closed`}
                color="#FF6B35"
              />
              <RateBlock
                label="Goal Completion"
                value={`${safePct(stats.goalsCompleted, stats.totalGoals)}%`}
                sub={`${stats.goalsCompleted} of ${stats.totalGoals} goals`}
                color="#9B5DE5"
              />
              <RateBlock
                label="Overall Defense"
                value={`${safePct(defDone, defTotal)}%`}
                sub={`${defDone} of ${defTotal} tasks`}
                color="#00B4D8"
              />
            </div>
          </div>

          {/* Defense Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <SectionLabel>Defense Breakdown</SectionLabel>
            <div className="space-y-5 mt-2">
              {[
                { label: 'Mind',   done: stats.mindCompleted,   total: stats.mindTotal,   color: '#9B5DE5' },
                { label: 'Spirit', done: stats.spiritCompleted, total: stats.spiritTotal, color: '#00B4D8' },
                { label: 'Body',   done: stats.bodyCompleted,   total: stats.bodyTotal,   color: '#2DC653' },
              ].map(({ label, done, total, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{done.toLocaleString()} / {total.toLocaleString()}</span>
                  </div>
                  <ProgressBar value={done} total={total} color={color} />
                </div>
              ))}
            </div>
          </div>

          {/* Hit Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <SectionLabel>Hit Distribution</SectionLabel>
            <div className="space-y-5 mt-2">
              {[
                { label: '1B  Single', count: stats.singles, color: '#2DC653' },
                { label: '2B  Double', count: stats.doubles, color: '#00B4D8' },
                { label: '3B  Triple', count: stats.triples, color: '#9B5DE5' },
                { label: 'HR  Homer',  count: stats.homers,  color: '#FF6B35' },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700 font-mono">{label}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{count.toLocaleString()} &nbsp;({safePct(count, hitTotal)}%)</span>
                  </div>
                  <ProgressBar value={count} total={hitTotal} color={color} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Feature Adoption ── */}
        <section>
          <SectionLabel>Feature Adoption</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Card label="Username Set"    value={stats.usernameSetUsers}   sub={`of ${stats.totalUsers} players`} />
            <Card label="Discoverable"    value={stats.discoverableUsers}  sub="social search on"    accent="text-brand-teal" />
            <Card label="Bible Verse"     value={stats.bibleVerseUsers}    sub="daily verse enabled" accent="text-brand-purple" />
            <Card label="Auto-Carry Tasks" value={stats.autoCarryUsers}   sub="tasks carry over"    accent="text-brand-green" />
            <Card label="Pinch Hitter Tokens" value={stats.totalTokens}   sub="tokens in circulation" accent="text-brand-orange" />
          </div>
        </section>

        {/* ── Player Table ── */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <SectionLabel>Players ({filtered.length}{filtered.length !== users.length ? ` of ${users.length}` : ''})</SectionLabel>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, username…"
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 w-64 focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange outline-none bg-white"
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  {th('displayName',      'Player')}
                  {th('email',            'Email')}
                  {th('joinedAt',         'Joined')}
                  {th('lastActive',       'Last Active')}
                  {th('sport',            'Sport')}
                  {th('totalSeasons',     'Seasons',   true)}
                  {th('totalGames',       'Games',     true)}
                  {th('gamesWon',         'W',         true)}
                  {th('gamesLost',        'L',         true)}
                  {th('gamesTied',        'T',         true)}
                  {th('gameWinPct',       'G Win%',    true)}
                  {th('totalInnings',     'Innings',   true)}
                  {th('inningsWon',       'I Won',     true)}
                  {th('inningWinPct',     'I Win%',    true)}
                  {th('totalGoals',       'Goals',     true)}
                  {th('goalsCompleted',   'G Done',    true)}
                  {th('goalCompPct',      'G%',        true)}
                  {th('singles',          '1B',        true)}
                  {th('doubles',          '2B',        true)}
                  {th('triples',          '3B',        true)}
                  {th('homers',           'HR',        true)}
                  {th('mindCompPct',      'Mind%',     true)}
                  {th('spiritCompPct',    'Spirit%',   true)}
                  {th('bodyCompPct',      'Body%',     true)}
                  {th('rainDelayInnings', 'Rain',      true)}
                  {th('pinchHitUsed',     'PH',        true)}
                  {th('pinchHitterTokens','Tokens',    true)}
                  {th('bibleVerse',       'Bible')}
                  {th('autoCarry',        'Auto')}
                  {th('isDiscoverable',   'Social')}
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`border-b border-slate-100 hover:bg-orange-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    {/* Player */}
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <p className="font-medium text-brand-navy leading-tight">{u.displayName}</p>
                      {u.username  && <p className="text-xs text-slate-400">@{u.username}</p>}
                      {u.teamName  && <p className="text-xs text-slate-400">{u.teamName}</p>}
                    </td>
                    {/* Email */}
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{u.email}</td>
                    {/* Joined */}
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap tabular-nums">{fmtDate(u.joinedAt)}</td>
                    {/* Last Active */}
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap tabular-nums">{fmtDate(u.lastActive)}</td>
                    {/* Sport */}
                    <td className="px-3 py-2.5 text-slate-500 capitalize whitespace-nowrap">{u.sport}</td>
                    {/* Seasons */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{u.totalSeasons}</td>
                    {/* Games */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{u.totalGames}</td>
                    {/* W */}
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-brand-green">{u.gamesWon}</td>
                    {/* L */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-brand-red">{u.gamesLost}</td>
                    {/* T */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{u.gamesTied}</td>
                    {/* G Win% */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(u.gameWinPct)}</td>
                    {/* Innings */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{u.totalInnings}</td>
                    {/* I Won */}
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-brand-green">{u.inningsWon}</td>
                    {/* I Win% */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(u.inningWinPct)}</td>
                    {/* Goals */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{u.totalGoals}</td>
                    {/* G Done */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{u.goalsCompleted}</td>
                    {/* G% */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(u.goalCompPct)}</td>
                    {/* 1B */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-brand-green">{u.singles}</td>
                    {/* 2B */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-brand-teal">{u.doubles}</td>
                    {/* 3B */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-brand-purple">{u.triples}</td>
                    {/* HR */}
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-brand-orange">{u.homers}</td>
                    {/* Mind% */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(u.mindCompPct)}</td>
                    {/* Spirit% */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(u.spiritCompPct)}</td>
                    {/* Body% */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(u.bodyCompPct)}</td>
                    {/* Rain */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{u.rainDelayInnings}</td>
                    {/* PH */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{u.pinchHitUsed}</td>
                    {/* Tokens */}
                    <td className="px-3 py-2.5 text-right tabular-nums">{u.pinchHitterTokens}</td>
                    {/* Bible */}
                    <td className="px-3 py-2.5 text-center">{u.bibleVerse     ? <Check /> : <Dash />}</td>
                    {/* Auto */}
                    <td className="px-3 py-2.5 text-center">{u.autoCarry      ? <Check /> : <Dash />}</td>
                    {/* Social */}
                    <td className="px-3 py-2.5 text-center">{u.isDiscoverable ? <Check /> : <Dash />}</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={30} className="px-3 py-10 text-center text-slate-400">No players found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-right">Click any column header to sort · Shift columns by scrolling</p>
        </section>

      </div>
    </div>
  )
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">{children}</h2>
}

function Card({ label, value, sub, accent = 'text-brand-navy' }: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${accent}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function RateBlock({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-3xl font-extrabold" style={{ color }}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function Check() {
  return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-brand-green text-xs font-bold">✓</span>
}

function Dash() {
  return <span className="text-slate-300 text-base">—</span>
}
