export type Sport      = 'softball' | 'baseball'
export type Status     = 'IN_PROGRESS' | 'CLOSED'
export type GameResult = 'WIN' | 'LOSS' | 'TIE' | 'IN_PROGRESS'
export type HitType    = 'single' | 'double' | 'triple' | 'homer'

export interface Profile {
  id:                  string
  display_name:        string | null
  avatar_url:          string | null
  sport:               Sport
  created_at:          string
  default_mind_task:    string | null
  default_spirit_task:  string | null
  default_body_task:    string | null
  default_offense_goals: string | null  // JSON array of goal strings
  username:             string | null
}

export interface SeasonGoal {
  id:         string
  season_id:  string
  user_id:    string
  text:       string
  completed:  boolean
  sort_order: number
}

export interface OffenseGoal {
  id:         string
  inning_id:  string
  user_id:    string
  goal:       string
  completed:  boolean
  hit_type:   HitType
  sort_order: number
}

export interface FullInning {
  id:               string
  game_id:          string
  user_id:          string
  date:             string
  inning_number:    number
  status:           Status
  target_goals:     number
  mind_task:        string
  mind_completed:   boolean
  spirit_task:      string
  spirit_completed: boolean
  body_task:        string
  body_completed:   boolean
  reflection:       string
  future_goals:     string
  closed_at:        string | null
  result:           GameResult
  is_rain_delay:    boolean
  offense_goals:    OffenseGoal[]
}

export interface FullGame {
  id:         string
  season_id:  string
  user_id:    string
  week_start: string
  week_end:   string
  result:     GameResult
  innings:    FullInning[]
}

export interface FullSeason {
  id:           string
  user_id:      string
  start_date:   string
  end_date:     string | null
  is_current:   boolean
  created_at:   string
  season_goals: SeasonGoal[]
  games:        FullGame[]
}
