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

export function inningResult(inning: Pick<FullInning, 'status' | 'is_rain_delay' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>): GameResult {
  if (inning.status !== 'CLOSED') return 'IN_PROGRESS'
  if (inning.is_rain_delay) return 'IN_PROGRESS'
  if (countOuts(inning) < 3) return 'LOSS'
  return simulateRuns(inning.offense_goals) > 0 ? 'WIN' : 'TIE'
}

export function gameResult(innings: Pick<FullInning, 'status' | 'is_rain_delay' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[]): GameResult {
  const wins      = innings.filter(i => inningResult(i) === 'WIN').length
  const losses    = innings.filter(i => inningResult(i) === 'LOSS').length
  const closed    = innings.filter(i => i.status === 'CLOSED').length
  const remaining = Math.max(0, 7 - closed)
  if (wins > losses + remaining) return 'WIN'
  if (losses > wins + remaining) return 'LOSS'
  return 'IN_PROGRESS'
}

export function currentStreak(games: { innings: Pick<FullInning, 'status' | 'is_rain_delay' | 'date' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[] }[]): { type: 'WIN' | 'LOSS' | null; count: number } {
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

export function seasonRecord(games: { innings: Pick<FullInning, 'status' | 'is_rain_delay' | 'mind_completed' | 'spirit_completed' | 'body_completed' | 'offense_goals'>[] }[]): { wins: number; losses: number } {
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
  // ── Strength & courage ────────────────────────────────────────
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
  { text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.', ref: 'Joshua 1:9' },
  { text: 'Be strong and courageous, because you will lead these people to inherit the land I swore to their ancestors.', ref: 'Joshua 1:6' },
  { text: 'The LORD is my strength and my shield; my heart trusts in him, and he helps me.', ref: 'Psalm 28:7' },
  { text: 'With man this is impossible, but with God all things are possible.', ref: 'Matthew 19:26' },
  { text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.', ref: '2 Timothy 1:7' },
  { text: 'Be strong and courageous. Do not be afraid or terrified because of them, for the LORD your God goes with you; he will never leave you nor forsake you.', ref: 'Deuteronomy 31:6' },
  { text: 'The LORD is my light and my salvation — whom shall I fear? The LORD is the stronghold of my life — of whom shall I be afraid?', ref: 'Psalm 27:1' },
  { text: 'God is our refuge and strength, an ever-present help in trouble.', ref: 'Psalm 46:1' },
  { text: 'But the Lord is faithful, and he will strengthen you and protect you from the evil one.', ref: '2 Thessalonians 3:3' },
  { text: 'I lift up my eyes to the mountains — where does my help come from? My help comes from the LORD, the Maker of heaven and earth.', ref: 'Psalm 121:1–2' },
  { text: 'He gives strength to the weary and increases the power of the weak.', ref: 'Isaiah 40:29' },
  { text: 'The LORD gives strength to his people; the LORD blesses his people with peace.', ref: 'Psalm 29:11' },

  // ── Perseverance & discipline ─────────────────────────────────
  { text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.', ref: 'Galatians 6:9' },
  { text: 'Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.', ref: 'Colossians 3:23' },
  { text: 'No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace for those who have been trained by it.', ref: 'Hebrews 12:11' },
  { text: 'Therefore, since we are surrounded by such a great cloud of witnesses, let us throw off everything that hinders and the sin that so easily entangles. And let us run with perseverance the race marked out for us.', ref: 'Hebrews 12:1' },
  { text: 'Consider it pure joy, my brothers and sisters, whenever you face trials of many kinds, because you know that the testing of your faith produces perseverance.', ref: 'James 1:2–3' },
  { text: 'Blessed is the one who perseveres under trial because, having stood the test, that person will receive the crown of life.', ref: 'James 1:12' },
  { text: 'Do you not know that in a race all the runners run, but only one gets the prize? Run in such a way as to get the prize.', ref: '1 Corinthians 9:24' },
  { text: 'I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.', ref: 'Philippians 3:14' },
  { text: 'For physical training is of some value, but godliness has value for all things, holding promise for both the present life and the life to come.', ref: '1 Timothy 4:8' },
  { text: 'So do not throw away your confidence; it will be richly rewarded. You need to persevere so that when you have done the will of God, you will receive what he has promised.', ref: 'Hebrews 10:35–36' },

  // ── Trust & faith ─────────────────────────────────────────────
  { text: 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.', ref: 'Proverbs 3:5–6' },
  { text: 'Commit to the LORD whatever you do, and he will establish your plans.', ref: 'Proverbs 16:3' },
  { text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.', ref: 'Romans 8:28' },
  { text: 'But seek first his kingdom and his righteousness, and all these things will be given to you as well.', ref: 'Matthew 6:33' },
  { text: 'For we live by faith, not by sight.', ref: '2 Corinthians 5:7' },
  { text: 'Now faith is confidence in what we hope for and assurance about what we do not see.', ref: 'Hebrews 11:1' },
  { text: 'Delight yourself in the LORD, and he will give you the desires of your heart.', ref: 'Psalm 37:4' },
  { text: 'In their hearts humans plan their course, but the LORD establishes their steps.', ref: 'Proverbs 16:9' },
  { text: 'Many are the plans in a person\'s heart, but it is the LORD\'s purpose that prevails.', ref: 'Proverbs 19:21' },
  { text: 'The LORD directs the steps of the godly. He delights in every detail of their lives.', ref: 'Psalm 37:23' },
  { text: 'Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty.', ref: 'Psalm 91:1' },

  // ── Hope & renewal ────────────────────────────────────────────
  { text: 'But those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.', ref: 'Isaiah 40:31' },
  { text: 'For I know the plans I have for you — plans to prosper you and not to harm you, plans to give you hope and a future.', ref: 'Jeremiah 29:11' },
  { text: 'The LORD your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.', ref: 'Zephaniah 3:17' },
  { text: 'Because of the LORD\'s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.', ref: 'Lamentations 3:22–23' },
  { text: '"For I will restore health to you and heal your wounds," declares the LORD.', ref: 'Jeremiah 30:17' },
  { text: 'He restores my soul. He guides me along the right paths for his name\'s sake.', ref: 'Psalm 23:3' },
  { text: 'Therefore, if anyone is in Christ, the new creation has come: the old has gone, the new is here!', ref: '2 Corinthians 5:17' },
  { text: 'And the God of all grace, who called you to his eternal glory in Christ, after you have suffered a little while, will himself restore you and make you strong, firm and steadfast.', ref: '1 Peter 5:10' },
  { text: 'But those who hope in the LORD will inherit the land.', ref: 'Psalm 37:9' },
  { text: 'May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.', ref: 'Romans 15:13' },

  // ── Peace & stillness ─────────────────────────────────────────
  { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
  { text: 'The LORD is my shepherd, I lack nothing.', ref: 'Psalm 23:1' },
  { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', ref: 'Philippians 4:6' },
  { text: 'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.', ref: 'Philippians 4:7' },
  { text: 'Therefore do not worry about tomorrow, for tomorrow will worry about itself. Each day has enough trouble of its own.', ref: 'Matthew 6:34' },
  { text: 'I have told you these things, so that in me you may have peace. In this world you will have trouble. But take heart! I have overcome the world.', ref: 'John 16:33' },
  { text: 'Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.', ref: 'John 14:27' },
  { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', ref: 'Matthew 11:28' },
  { text: 'You will keep in perfect peace those whose minds are steadfast, because they trust in you.', ref: 'Isaiah 26:3' },
  { text: 'Cast all your anxiety on him because he cares for you.', ref: '1 Peter 5:7' },
  { text: 'The LORD bless you and keep you; the LORD make his face shine on you and be gracious to you; the LORD turn his face toward you and give you peace.', ref: 'Numbers 6:24–26' },

  // ── Purpose & calling ─────────────────────────────────────────
  { text: 'For we are God\'s handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.', ref: 'Ephesians 2:10' },
  { text: 'Before I formed you in the womb I knew you, before you were born I set you apart.', ref: 'Jeremiah 1:5' },
  { text: 'You did not choose me, but I chose you and appointed you so that you might go and bear fruit — fruit that will last.', ref: 'John 15:16' },
  { text: 'For it is God who works in you to will and to act in order to fulfill his good purpose.', ref: 'Philippians 2:13' },
  { text: 'We have different gifts, according to the grace given to each of us.', ref: 'Romans 12:6' },
  { text: 'Each of you should use whatever gift you have received to serve others, as faithful stewards of God\'s grace in its various forms.', ref: '1 Peter 4:10' },
  { text: 'I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.', ref: 'Psalm 139:14' },
  { text: 'For you created my inmost being; you knit me together in my mother\'s womb.', ref: 'Psalm 139:13' },
  { text: 'The heart of man plans his way, but the LORD establishes his steps.', ref: 'Proverbs 16:9' },

  // ── Wisdom & guidance ─────────────────────────────────────────
  { text: 'If any of you lacks wisdom, you should ask God, who gives generously to all without finding fault, and it will be given to you.', ref: 'James 1:5' },
  { text: 'Your word is a lamp for my feet, a light on my path.', ref: 'Psalm 119:105' },
  { text: 'The fear of the LORD is the beginning of wisdom; all who follow his precepts have good understanding.', ref: 'Psalm 111:10' },
  { text: 'Listen to advice and accept discipline, and at the end you will be counted among the wise.', ref: 'Proverbs 19:20' },
  { text: 'Plans fail for lack of counsel, but with many advisers they succeed.', ref: 'Proverbs 15:22' },
  { text: 'I will instruct you and teach you in the way you should go; I will counsel you with my loving eye on you.', ref: 'Psalm 32:8' },

  // ── Love & character ──────────────────────────────────────────
  { text: 'Love is patient, love is kind. It does not envy, it does not boast, it is not proud.', ref: '1 Corinthians 13:4' },
  { text: 'Do nothing out of selfish ambition or vain conceit. Rather, in humility value others above yourselves.', ref: 'Philippians 2:3' },
  { text: 'Do not let any unwholesome talk come out of your mouths, but only what is helpful for building others up.', ref: 'Ephesians 4:29' },
  { text: 'A generous person will prosper; whoever refreshes others will be refreshed.', ref: 'Proverbs 11:25' },
  { text: 'Whoever wants to become great among you must be your servant.', ref: 'Matthew 20:26' },
  { text: 'Above all, love each other deeply, because love covers over a multitude of sins.', ref: '1 Peter 4:8' },
  { text: 'Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.', ref: 'Matthew 5:16' },

  // ── Victory & overcoming ──────────────────────────────────────
  { text: 'No, in all these things we are more than conquerors through him who loved us.', ref: 'Romans 8:37' },
  { text: 'For everyone born of God overcomes the world. This is the victory that has overcome the world, even our faith.', ref: '1 John 5:4' },
  { text: 'But thanks be to God! He gives us the victory through our Lord Jesus Christ.', ref: '1 Corinthians 15:57' },
  { text: 'The LORD will fight for you; you need only to be still.', ref: 'Exodus 14:14' },
  { text: 'With God we will gain the victory, and he will trample down our enemies.', ref: 'Psalm 60:12' },
  { text: 'Submit yourselves, then, to God. Resist the devil, and he will flee from you.', ref: 'James 4:7' },
  { text: 'I have fought the good fight, I have finished the race, I have kept the faith.', ref: '2 Timothy 4:7' },

  // ── Gratitude & contentment ───────────────────────────────────
  { text: 'Give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.', ref: '1 Thessalonians 5:18' },
  { text: 'I have learned, in whatever state I am, to be content.', ref: 'Philippians 4:11' },
  { text: 'This is the day the LORD has made; let us rejoice and be glad in it.', ref: 'Psalm 118:24' },
  { text: 'Every good and perfect gift is from above, coming down from the Father of the heavenly lights.', ref: 'James 1:17' },
  { text: 'Rejoice in the Lord always. I will say it again: Rejoice!', ref: 'Philippians 4:4' },
  { text: 'Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name.', ref: 'Psalm 100:4' },
]

export function getDailyVerse(): { text: string; ref: string } {
  const d = new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000)
  return VERSES[dayOfYear % VERSES.length]
}
