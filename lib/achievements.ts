import type { FullSeason } from '@/types'
import { inningResult, gameResult, simulateRuns, countOuts } from './game-logic'

export interface Achievement {
  id:          string
  icon:        string
  name:        string
  description: string
  unlocked:    boolean
}

export function computeAchievements(season: FullSeason): Achievement[] {
  const allInnings = season.games
    .flatMap(g => g.innings)
    .sort((a, b) => a.date.localeCompare(b.date))

  const closed = allInnings.filter(i => i.status === 'CLOSED')

  // Helpers
  const results     = closed.map(i => inningResult(i))
  const totalRuns   = allInnings.reduce((sum, i) => sum + simulateRuns(i.offense_goals), 0)
  const totalHomers = allInnings.flatMap(i => i.offense_goals).filter(g => g.completed && g.hit_type === 'homer').length

  function bestStreak(type: 'WIN' | 'LOSS'): number {
    let best = 0, cur = 0
    for (const r of results) {
      if (r === type) { cur++; best = Math.max(best, cur) } else cur = 0
    }
    return best
  }

  function perfectWeekExists(): boolean {
    return season.games.some(g => {
      const closed = g.innings.filter(i => i.status === 'CLOSED')
      return closed.length === 7 && closed.every(i => inningResult(i) === 'WIN')
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

  const seasonWon = (() => {
    const gamesPlayed = season.games.filter(g => g.innings.some(i => i.status === 'CLOSED'))
    const wins   = gamesPlayed.filter(g => gameResult(g.innings) === 'WIN').length
    const losses = gamesPlayed.filter(g => gameResult(g.innings) === 'LOSS').length
    return wins > losses && gamesPlayed.length >= 2
  })()

  return [
    {
      id:          'first_win',
      icon:        '🩸',
      name:        'First Blood',
      description: 'Win your first inning',
      unlocked:    results.includes('WIN'),
    },
    {
      id:          'hat_trick',
      icon:        '🎩',
      name:        'Hat Trick',
      description: '3-inning win streak',
      unlocked:    bestStreak('WIN') >= 3,
    },
    {
      id:          'on_fire',
      icon:        '🔥',
      name:        'On Fire',
      description: '5-inning win streak',
      unlocked:    bestStreak('WIN') >= 5,
    },
    {
      id:          'unstoppable',
      icon:        '⚡',
      name:        'Unstoppable',
      description: '7-inning win streak',
      unlocked:    bestStreak('WIN') >= 7,
    },
    {
      id:          'perfect_week',
      icon:        '💎',
      name:        'Perfect Week',
      description: 'Win all 7 innings in one week',
      unlocked:    perfectWeekExists(),
    },
    {
      id:          'iron_defense',
      icon:        '🛡️',
      name:        'Iron Defense',
      description: 'Get 3 outs in 5 straight innings',
      unlocked:    maxConsecutiveFullDefense() >= 5,
    },
    {
      id:          'triple_threat',
      icon:        '🎯',
      name:        'Triple Threat',
      description: 'Complete all 3 defense tasks 7 days in a row',
      unlocked:    maxConsecutiveTripleThreat() >= 7,
    },
    {
      id:          'slugger',
      icon:        '💥',
      name:        'Slugger',
      description: 'Score 25 total runs',
      unlocked:    totalRuns >= 25,
    },
    {
      id:          'home_run_king',
      icon:        '🚀',
      name:        'Home Run King',
      description: 'Hit 10 home runs total',
      unlocked:    totalHomers >= 10,
    },
    {
      id:          'champion',
      icon:        '🏆',
      name:        'Champion',
      description: 'Win a season (more game wins than losses)',
      unlocked:    seasonWon,
    },
  ]
}
