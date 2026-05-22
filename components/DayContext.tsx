'use client'

import { inningNumber } from '@/lib/game-logic'
import type { FullSeason } from '@/types'

interface Props {
  season:        FullSeason
  todayStr:      string
  sport:         'softball' | 'baseball'
  inningsPlayed: number
  inningsWon:    number
}

// ── Rotating flavor lines ─────────────────────────────────────────────────────
// Picked by (daysElapsed % length) — stable within a day, fresh each session.
// 120 lines = ~4 months before a repeat.
const FLAVOR_LINES = [
  // ── Baseball-flavored ──────────────────────────────────────────
  "Step up to the plate.",
  "The only inning that matters is this one.",
  "Three outs. That's the goal.",
  "Back in the box. Time to swing.",
  "Defense wins games. Offense wins fans.",
  "Every inning shapes the season.",
  "The scoreboard doesn't lie.",
  "One inning at a time.",
  "Build the habit. Win the inning.",
  "Stay in the box. Keep swinging.",
  "Full count. No room for error.",
  "Play ball. Every single day.",
  "Swing at strikes. Lay off the junk.",
  "The best hitters fail 7 times out of 10. Keep swinging.",
  "Winners make contact. Do the work.",
  "Load the bases before you try to score.",
  "Every at-bat is a new chance.",
  "The game isn't over until the last out.",
  "Run out every ground ball.",
  "Small ball wins championships.",
  "Your swing doesn't fix itself. You fix it.",
  "The dugout doesn't win games. The field does.",
  "Play the long game. Season by season.",
  "No lead is safe if you stop working for it.",
  "The cleanup spot belongs to the person who earned it.",

  // ── Discipline & consistency ───────────────────────────────────
  "No excuses. Just outs.",
  "The grind is the game.",
  "Consistency beats talent. Every time.",
  "Small wins add up to seasons.",
  "Show up. Lock in. Win.",
  "Champions practice when no one's watching.",
  "Make today's inning count.",
  "Momentum is built one rep at a time.",
  "You rise to your habits, not your goals.",
  "Today's effort is tomorrow's results.",
  "Earn it. Every. Single. Day.",
  "Win today. Worry about tomorrow later.",
  "The work you skip today is the gap tomorrow.",
  "Discipline is just doing it when you don't feel like it.",
  "You don't need motivation. You need a routine.",
  "Systems beat willpower. Every time.",
  "Do it tired. Do it anyway.",
  "The best time to start was yesterday. The second best is now.",
  "Show up on the hard days. That's what separates.",
  "Amateurs wait for inspiration. Pros just work.",
  "Repetition is the mother of mastery.",
  "One percent better every day adds up fast.",
  "The gap between who you are and who you want to be is called work.",
  "Don't count the days. Make the days count.",
  "Hard days build strong seasons.",

  // ── Mind & focus ──────────────────────────────────────────────
  "What you focus on expands.",
  "Quiet the noise. Do the task.",
  "A sharp mind is your best defense.",
  "Think clearly. Act decisively.",
  "Control what you can control. Release the rest.",
  "The mind leads. The body follows.",
  "Pressure is a privilege. It means you're in the game.",
  "Worry is wasted energy. Channel it.",
  "Your thoughts set the tone before the day does.",
  "You can't think your way into winning. You act your way in.",
  "Calm is a superpower.",
  "Clear mind. Full commitment.",
  "Overthinking is the enemy of execution.",
  "Focus on the process. The results follow.",
  "Mental reps count too.",

  // ── Spirit & purpose ──────────────────────────────────────────
  "Purpose fuels what motivation can't sustain.",
  "Know your why. It'll carry you past the hard parts.",
  "You were made for more than average days.",
  "Your character is built in private before it shows in public.",
  "Be the kind of person who shows up.",
  "Gratitude changes the game before the game starts.",
  "Do it for the person you're becoming.",
  "Integrity means doing it when nobody's keeping score.",
  "Faith in the process. Even when you can't see the outcome.",
  "The best investment is in yourself.",
  "What you do in the dark shows up in the light.",
  "Serve well today. The rest takes care of itself.",
  "Your attitude is the only thing nobody can take from you.",
  "Be the energy you want the dugout to have.",
  "Chase growth. Not applause.",

  // ── Body & health ─────────────────────────────────────────────
  "Take care of the machine. It's the only one you've got.",
  "Your body keeps score. Treat it well.",
  "Recovery is part of training. Rest hard too.",
  "Strong body, sharp mind, clear spirit.",
  "You can't perform at full speed on an empty tank.",
  "Move every day. Even slow is forward.",
  "Physical discipline bleeds into every other discipline.",
  "The body achieves what the mind believes.",
  "Build it in the off-season. Use it on game day.",
  "Sleep, hydrate, move. The original performance stack.",

  // ── Short punchy openers ──────────────────────────────────────
  "Game day.",
  "Let's get to work.",
  "Today counts.",
  "No days off.",
  "Lock in.",
  "Make it matter.",
  "Stay the course.",
  "Outwork yesterday.",
  "Forward.",
  "Execute.",
  "Be present.",
  "Go.",

  // ── Longer / reflective ──────────────────────────────────────
  "The version of you who wins the season is built one inning at a time.",
  "You don't have to feel ready. You just have to start.",
  "Most people quit in the middle innings. Don't be most people.",
  "The habits you build in a season last a lifetime.",
  "Winning a day isn't glamorous. That's exactly the point.",
  "Hard work doesn't guarantee winning, but it makes losing rare.",
  "The person who shows up every day without needing to be reminded wins.",
  "You're not just building a record. You're building a person.",
]

export default function DayContext({ season, todayStr, sport, inningsPlayed, inningsWon }: Props) {
  const sportEmoji = sport === 'baseball' ? '⚾' : '🥎'

  // Game number — index of the game containing today
  const sortedGames = [...season.games].sort((a, b) => a.week_start.localeCompare(b.week_start))
  const gameIdx     = sortedGames.findIndex(g => g.week_start <= todayStr && g.week_end >= todayStr)
  const gameNum     = gameIdx >= 0 ? gameIdx + 1 : sortedGames.length + 1
  const inningNum   = inningNumber(todayStr)

  // Season progress
  const startMs     = new Date(season.start_date + 'T12:00:00').getTime()
  const todayMs     = new Date(todayStr + 'T12:00:00').getTime()
  const daysElapsed = Math.max(1, Math.round((todayMs - startMs) / 86_400_000) + 1)
  const totalDays   = season.length_weeks ? season.length_weeks * 7 : null
  const pct         = totalDays ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : null
  const daysLeft    = totalDays ? Math.max(0, totalDays - daysElapsed) : null

  const winRate = inningsPlayed > 0 ? Math.round((inningsWon / inningsPlayed) * 100) : null

  // Flavor line — rotates daily
  const flavorLine = FLAVOR_LINES[daysElapsed % FLAVOR_LINES.length]

  // Progress label
  const progressLabel = pct === null ? null :
    pct < 15  ? 'Early season' :
    pct < 40  ? 'Building momentum' :
    pct < 60  ? 'Halfway there' :
    pct < 80  ? 'Final stretch' :
    pct < 95  ? 'Closing strong' :
                'Last innings'

  return (
    <div className="rounded-2xl overflow-hidden mb-4 shadow-sm">

      {/* ── Navy header ─────────────────────────────────────────────── */}
      <div className="bg-brand-navy px-5 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">
              {sportEmoji} Game {gameNum} · Inning {inningNum}
            </p>
            <p className="text-white font-black text-xl leading-tight">
              {flavorLine}
            </p>
            {winRate !== null && inningsPlayed >= 3 && (
              <p className="text-white/40 text-xs mt-1.5 font-semibold">
                {inningsWon}W–{inningsPlayed - inningsWon}L &nbsp;·&nbsp; {winRate}% win rate
                {daysLeft !== null ? ` · ${daysLeft}d left` : ''}
              </p>
            )}
          </div>

          {pct !== null && (
            <div className="text-right flex-shrink-0 pt-0.5">
              <p className="text-3xl font-black text-brand-orange leading-none tabular-nums">{pct}%</p>
              <p className="text-white/30 text-[10px] mt-0.5 font-semibold">
                {progressLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      {pct !== null && (
        <div className="h-1.5 bg-brand-navy/80">
          <div
            className="h-full bg-gradient-to-r from-brand-orange to-amber-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* ── Win condition ─────────────────────────────────────────────── */}
      {season.success_definition && (
        <div className="bg-brand-navy/5 border-t border-slate-100 px-5 py-2.5">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-brand-navy">🎯 Win condition: </span>
            {season.success_definition}
          </p>
        </div>
      )}
    </div>
  )
}
