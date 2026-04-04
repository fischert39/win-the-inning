import type { FullSeason } from '@/types'
import { inningResult, gameResult, simulateRuns, countOuts } from './game-logic'

export interface Achievement {
  id:          string
  icon:        string
  name:        string
  description: string
  unlocked:    boolean
  category:    'streak' | 'defense' | 'offense' | 'season'
}

export function computeAchievements(season: FullSeason): Achievement[] {
  const allInnings = season.games
    .flatMap(g => g.innings)
    .sort((a, b) => a.date.localeCompare(b.date))

  const closed    = allInnings.filter(i => i.status === 'CLOSED' && !i.is_rain_delay)
  const results   = closed.map(i => inningResult(i))
  const totalRuns = allInnings.reduce((sum, i) => sum + simulateRuns(i.offense_goals), 0)
  const totalHomers = allInnings
    .flatMap(i => i.offense_goals)
    .filter(g => g.completed && g.hit_type === 'homer').length

  function bestStreak(type: 'WIN' | 'LOSS'): number {
    let best = 0, cur = 0
    for (const r of results) {
      if (r === type) { cur++; best = Math.max(best, cur) } else cur = 0
    }
    return best
  }

  function perfectWeekExists(): boolean {
    return season.games.some(g => {
      const c = g.innings.filter(i => i.status === 'CLOSED' && !i.is_rain_delay)
      return c.length === 7 && c.every(i => inningResult(i) === 'WIN')
    })
  }

  function maxConsecutiveFullDefense(): number {
    let best = 0, cur = 0
    for (const i of closed) {
      if (countOuts(i) === 3) { cur++; best = Math.max(best, cur) } else cur = 0
    }
    return best
  }

  function maxConsecutiveTripleThreat(): number {
    let best = 0, cur = 0
    for (const i of closed) {
      if (i.mind_completed && i.spirit_completed && i.body_completed) { cur++; best = Math.max(best, cur) } else cur = 0
    }
    return best
  }

  function hasComeback(): boolean {
    for (let i = 1; i < results.length; i++) {
      if (results[i] === 'WIN' && results[i - 1] === 'LOSS') return true
    }
    return false
  }

  function maxRunsInSingleInning(): number {
    return Math.max(0, ...allInnings.map(i => simulateRuns(i.offense_goals)))
  }

  function hasAllStarInning(): boolean {
    return closed.some(i => countOuts(i) === 3 && simulateRuns(i.offense_goals) >= 3)
  }

  function twoGamesInARow(): boolean {
    const gPlayed = season.games.filter(g => g.innings.some(i => i.status === 'CLOSED'))
    for (let i = 1; i < gPlayed.length; i++) {
      if (gameResult(gPlayed[i].innings) === 'WIN' && gameResult(gPlayed[i - 1].innings) === 'WIN') return true
    }
    return false
  }

  const seasonWon = (() => {
    const gPlayed = season.games.filter(g => g.innings.some(i => i.status === 'CLOSED'))
    const wins   = gPlayed.filter(g => gameResult(g.innings) === 'WIN').length
    const losses = gPlayed.filter(g => gameResult(g.innings) === 'LOSS').length
    return wins > losses && gPlayed.length >= 2
  })()

  return [
    // ── Streak ──────────────────────────────────────────────────
    {
      id: 'first_win', icon: '🩸', name: 'First Blood',
      description: 'Win your first inning',
      unlocked: results.includes('WIN'),
      category: 'streak',
    },
    {
      id: 'hat_trick', icon: '🎩', name: 'Hat Trick',
      description: '3-inning win streak',
      unlocked: bestStreak('WIN') >= 3,
      category: 'streak',
    },
    {
      id: 'on_fire', icon: '🔥', name: 'On Fire',
      description: '5-inning win streak',
      unlocked: bestStreak('WIN') >= 5,
      category: 'streak',
    },
    {
      id: 'unstoppable', icon: '⚡', name: 'Unstoppable',
      description: '7-inning win streak',
      unlocked: bestStreak('WIN') >= 7,
      category: 'streak',
    },
    {
      id: 'comeback', icon: '🔃', name: 'Comeback Kid',
      description: 'Win an inning the day after a loss',
      unlocked: hasComeback(),
      category: 'streak',
    },
    {
      id: 'two_games', icon: '📈', name: 'Back to Back',
      description: 'Win two games in a row',
      unlocked: twoGamesInARow(),
      category: 'streak',
    },

    // ── Defense ─────────────────────────────────────────────────
    {
      id: 'iron_defense', icon: '🛡️', name: 'Iron Defense',
      description: 'Get 3 outs in 5 straight innings',
      unlocked: maxConsecutiveFullDefense() >= 5,
      category: 'defense',
    },
    {
      id: 'triple_threat', icon: '🎯', name: 'Triple Threat',
      description: 'Complete all 3 defense tasks 7 days in a row',
      unlocked: maxConsecutiveTripleThreat() >= 7,
      category: 'defense',
    },
    {
      id: 'mind_master', icon: '🧠', name: 'Mind Master',
      description: 'Complete your mind task 10 times',
      unlocked: closed.filter(i => i.mind_completed).length >= 10,
      category: 'defense',
    },
    {
      id: 'spirit_guide', icon: '✨', name: 'Spirit Guide',
      description: 'Complete your spirit task 10 times',
      unlocked: closed.filter(i => i.spirit_completed).length >= 10,
      category: 'defense',
    },
    {
      id: 'iron_body', icon: '💪', name: 'Iron Body',
      description: 'Complete your body task 10 times',
      unlocked: closed.filter(i => i.body_completed).length >= 10,
      category: 'defense',
    },

    // ── Offense ─────────────────────────────────────────────────
    {
      id: 'slugger', icon: '💥', name: 'Slugger',
      description: 'Score 25 total runs in a season',
      unlocked: totalRuns >= 25,
      category: 'offense',
    },
    {
      id: 'home_run_king', icon: '🚀', name: 'Home Run King',
      description: 'Hit 10 home runs total',
      unlocked: totalHomers >= 10,
      category: 'offense',
    },
    {
      id: 'grand_slam', icon: '🎰', name: 'Grand Slam',
      description: 'Score 5+ runs in a single inning',
      unlocked: maxRunsInSingleInning() >= 5,
      category: 'offense',
    },
    {
      id: 'all_star', icon: '🌟', name: 'All-Star',
      description: 'Get 3 outs AND score 3+ runs in one inning',
      unlocked: hasAllStarInning(),
      category: 'offense',
    },

    // ── Season ──────────────────────────────────────────────────
    {
      id: 'committed', icon: '📅', name: 'Committed',
      description: 'Play a full week (7 innings)',
      unlocked: closed.length >= 7,
      category: 'season',
    },
    {
      id: 'marathon', icon: '🏃', name: 'Marathon',
      description: 'Play 21 innings in a season',
      unlocked: closed.length >= 21,
      category: 'season',
    },
    {
      id: 'perfect_week', icon: '💎', name: 'Perfect Week',
      description: 'Win all 7 innings in one week',
      unlocked: perfectWeekExists(),
      category: 'season',
    },
    {
      id: 'centurion', icon: '💯', name: 'Centurion',
      description: 'Score 100 total runs in a season',
      unlocked: totalRuns >= 100,
      category: 'season',
    },
    {
      id: 'champion', icon: '🏆', name: 'Champion',
      description: 'Win a season (more game wins than losses)',
      unlocked: seasonWon,
      category: 'season',
    },
  ]
}
