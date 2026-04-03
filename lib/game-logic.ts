import type { FullInning, OffenseGoal, GameResult } from '@/types'

// ===== GAME CALCULATIONS =====

export function countOuts(inning: Pick<FullInning, 'mind_completed' | 'spirit_completed' | 'body_completed'>): number {
  return [inning.mind_completed, inning.spirit_completed, inning.body_completed].filter(Boolean).length
}

export function simulateRuns(goals: Pick<OffenseGoal, 'completed' | 'hit_type'>[]): number {
  const hits = goals.filter(g => g.completed).map(g => g.hit_type)
  let bases: [boolean, boolean, boolean] = [false, false, false]
  let runs = 0
  for (const hit of hits) {
    if (hit === 'homer') {
      runs += bases.filter(Boolean).length + 1
      bases = [false, false, false]
    } else {
      const adv = hit === 'single' ? 1 : hit === 'double' ? 2 : 3
      for (let i = 2; i >= 0; i--) {
        if (bases[i]) {
          if (i + adv >= 3) runs++
          else bases[i + adv] = true
          bases[i] = false
        }
      }
      bases[adv - 1] = true
    }
  }
  return runs
}

export function getBaseState(goals: Pick<OffenseGoal, 'completed' | 'hit_type'>[]): [boolean, boolean, boolean] {
  const hits = goals.filter(g => g.completed).map(g => g.hit_type)
  let bases: [boolean, boolean, boolean] = [false, false, false]
  for (const hit of hits) {
    if (hit === 'homer') {
      bases = [false, false, false]
    } else {
      const adv = hit === 'single' ? 1 : hit === 'double' ? 2 : 3
      for (let i = 2; i >= 0; i--) {
        if (bases[i]) {
          if (i + adv < 3) bases[i + adv] = true
          bases[i] = false
        }
      }
      bases[adv - 1] = true
    }
  }
  return bases
}

export function inningResult(inning: Pick<FullInning, 'status' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>): GameResult {
  if (inning.status !== 'CLOSED') return 'IN_PROGRESS'
  if (countOuts(inning) < 3) return 'LOSS'
  return simulateRuns(inning.offense_goals) > 0 ? 'WIN' : 'TIE'
}

export function gameResult(innings: Pick<FullInning, 'status' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[]): GameResult {
  const wins      = innings.filter(i => inningResult(i) === 'WIN').length
  const losses    = innings.filter(i => inningResult(i) === 'LOSS').length
  const closed    = innings.filter(i => i.status === 'CLOSED').length
  const remaining = Math.max(0, 7 - closed)
  if (wins > losses + remaining) return 'WIN'
  if (losses > wins + remaining) return 'LOSS'
  return 'IN_PROGRESS'
}

export function currentStreak(games: { innings: Pick<FullInning, 'status' | 'date' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[] }[]): { type: 'WIN' | 'LOSS' | null; count: number } {
  const closed = games
    .flatMap(g => g.innings)
    .filter(i => i.status === 'CLOSED')
    .sort((a, b) => a.date.localeCompare(b.date))
  if (closed.length === 0) return { type: null, count: 0 }
  const lastResult = inningResult(closed[closed.length - 1])
  if (lastResult === 'TIE' || lastResult === 'IN_PROGRESS') return { type: null, count: 0 }
  const type = lastResult as 'WIN' | 'LOSS'
  let count = 0
  for (let i = closed.length - 1; i >= 0; i--) {
    const r = inningResult(closed[i])
    if (r !== type) break
    count++
  }
  return { type, count }
}

export function seasonRecord(games: { innings: Pick<FullInning, 'status' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[] }[]): { wins: number; losses: number } {
  let wins = 0, losses = 0
  for (const g of games) {
    const r = gameResult(g.innings)
    if (r === 'WIN') wins++
    else if (r === 'LOSS') losses++
  }
  return { wins, losses }
}

// ===== DATE HELPERS =====

export function getPrevDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return toDateKey(d)
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function today(): string {
  return toDateKey(new Date())
}

export function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  return toDateKey(d)
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return toDateKey(d)
}

export function getWeekDates(weekStartStr: string): string[] {
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    dates.push(toDateKey(d))
  }
  return dates
}

export function inningNumber(dateStr: string): number {
  const dow = new Date(dateStr + 'T12:00:00').getDay()
  return dow === 0 ? 7 : dow
}

export function dayShort(dateStr: string): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dateStr + 'T12:00:00').getDay()]
}

export function dayFull(dateStr: string): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(dateStr + 'T12:00:00').getDay()]
}

export function displayDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ===== DAILY QUOTE =====

const QUOTES = [
  { text: 'Every strike brings me closer to the next home run.', author: 'Babe Ruth' },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: 'Vince Lombardi' },
  { text: 'Champions keep playing until they get it right.', author: 'Billie Jean King' },
  { text: 'The harder the battle, the sweeter the victory.', author: 'Les Brown' },
  { text: "You miss 100% of the shots you don't take.", author: 'Wayne Gretzky' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: "You don't have to be great to start, but you have to start to be great.", author: 'Zig Ziglar' },
  { text: 'Pain is temporary. Quitting lasts forever.', author: 'Lance Armstrong' },
  { text: 'Success is not final, failure is not fatal — it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'We are what we repeatedly do. Excellence is not an act but a habit.', author: 'Aristotle' },
  { text: "Hard work beats talent when talent doesn't work hard.", author: 'Tim Notke' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { text: "Believe you can and you're halfway there.", author: 'Theodore Roosevelt' },
  { text: 'The mind is everything. What you think, you become.', author: 'Buddha' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
  { text: 'Wake up with determination. Go to bed with satisfaction.', author: 'Unknown' },
  { text: 'Talent wins games, but teamwork and intelligence win championships.', author: 'Michael Jordan' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
  { text: "Don't watch the clock. Do what it does — keep going.", author: 'Sam Levenson' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Dream big. Start small. Act now.', author: 'Robin Sharma' },
]

export function getDailyQuote(): { text: string; author: string } {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return QUOTES[dayOfYear % QUOTES.length]
}
