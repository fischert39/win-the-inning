import type { FullInning, OffenseGoal, GameResult } from '@/types'

// ===== GAME CALCULATIONS =====

export function countOuts(inning: Pick<FullInning, 'mind_completed' | 'spirit_completed' | 'body_completed' | 'pinch_hit_used'>): number {
  const base = [inning.mind_completed, inning.spirit_completed, inning.body_completed].filter(Boolean).length
  return Math.min(3, base + (inning.pinch_hit_used ? 1 : 0))
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

export function inningResult(inning: Pick<FullInning, 'status' | 'is_rain_delay' | 'pinch_hit_used' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>): GameResult {
  if (inning.status !== 'CLOSED') return 'IN_PROGRESS'
  if (inning.is_rain_delay) return 'IN_PROGRESS'
  if (countOuts(inning) < 3) return 'LOSS'
  return simulateRuns(inning.offense_goals) > 0 ? 'WIN' : 'TIE'
}

export function gameResult(innings: Pick<FullInning, 'status' | 'is_rain_delay' | 'pinch_hit_used' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[]): GameResult {
  const wins      = innings.filter(i => inningResult(i) === 'WIN').length
  const losses    = innings.filter(i => inningResult(i) === 'LOSS').length
  const closed    = innings.filter(i => i.status === 'CLOSED').length
  const remaining = Math.max(0, 7 - closed)
  if (wins > losses + remaining) return 'WIN'
  if (losses > wins + remaining) return 'LOSS'
  return 'IN_PROGRESS'
}

export function currentStreak(games: { innings: Pick<FullInning, 'status' | 'is_rain_delay' | 'pinch_hit_used' | 'date' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[] }[]): { type: 'WIN' | 'LOSS' | null; count: number } {
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

export function seasonRecord(games: { innings: Pick<FullInning, 'status' | 'is_rain_delay' | 'pinch_hit_used' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[] }[]): { wins: number; losses: number } {
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

export function getNextDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + 1)
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
  const d = new Date(dateStr + 'T12:00:00')
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = d.getFullYear()
  return `${m}/${day}/${y}`
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

// ===== DAILY BIBLE VERSE =====

const VERSES = [
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
  { text: 'For I know the plans I have for you — plans to prosper you and not to harm you, plans to give you hope and a future.', ref: 'Jeremiah 29:11' },
  { text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', ref: 'Proverbs 3:5–6' },
  { text: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', ref: 'Isaiah 40:31' },
  { text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.', ref: 'Joshua 1:9' },
  { text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.', ref: 'Galatians 6:9' },
  { text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.', ref: 'Colossians 3:23' },
  { text: 'Commit to the LORD whatever you do, and he will establish your plans.', ref: 'Proverbs 16:3' },
  { text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', ref: 'Romans 8:28' },
  { text: 'Be strong and courageous, because you will lead these people to inherit the land I swore to their ancestors.', ref: 'Joshua 1:6' },
  { text: 'The LORD is my strength and my shield; my heart trusts in him, and he helps me.', ref: 'Psalm 28:7' },
  { text: 'With man this is impossible, but with God all things are possible.', ref: 'Matthew 19:26' },
  { text: 'No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it.', ref: 'Hebrews 12:11' },
  { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', ref: 'Philippians 4:6' },
  { text: 'The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.', ref: 'Zephaniah 3:17' },
  { text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.', ref: '2 Timothy 1:7' },
  { text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.', ref: 'Matthew 6:33' },
  { text: 'I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world.', ref: 'John 16:33' },
  { text: 'Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.', ref: 'Matthew 6:34' },
  { text: 'The LORD is my shepherd, I lack nothing.', ref: 'Psalm 23:1' },
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
]

export function getDailyVerse(): { text: string; ref: string } {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return VERSES[dayOfYear % VERSES.length]
}
