export type Sport      = 'softball' | 'baseball'
export type Status     = 'IN_PROGRESS' | 'CLOSED'
export type GameResult = 'WIN' | 'LOSS' | 'TIE' | 'IN_PROGRESS'
export type HitType    = 'single' | 'double' | 'triple' | 'homer'

export interface Profile {
  id:                    string
  display_name:          string | null
  avatar_url:            string | null
  sport:                 Sport
  created_at:            string
  default_mind_task:     string | null
  default_spirit_task:   string | null
  default_body_task:     string | null
  default_offense_goals: string | null  // JSON array of goal strings
  username:              string | null
  team_name:             string | null
  mascot:                string | null
  pinch_hitter_tokens:   number
  daily_bible_verse:     boolean
  auto_carry_tasks:      boolean
  is_discoverable:       boolean
  public_email:          string | null
  group_team_id:         string | null  // FK to teams.id
}

// ── Teams ────────────────────────────────────────────────────

export interface GroupTeam {
  id:            string
  name:          string
  invite_code:   string | null  // only visible to admins
  is_public:     boolean
  created_by:    string
  my_role:       'admin' | 'member'
  my_status:     'active' | 'pending'
  member_count:  number
  pending_count: number
  achievements:  TeamAchievement[]
}

export interface TeamMemberStats {
  user_id:       string
  display_name:  string | null
  avatar_url:    string | null
  mascot:        string | null
  team_name:     string | null
  role:          'admin' | 'member'
  innings_won:   number
  innings_played: number
  game_wins:     number
  game_losses:   number
  win_streak:    number
  today_status:  'none' | 'open' | 'closed' | 'won'
  today_runs:    number
}

export type TeamActivityType =
  | 'inning_won'
  | 'inning_closed'
  | 'game_won'
  | 'game_lost'
  | 'nudge_sent'
  | 'member_joined'
  | 'achievement_unlocked'

export interface TeamActivity {
  id:           string
  type:         TeamActivityType
  metadata:     Record<string, unknown>
  created_at:   string
  display_name: string | null
  mascot:       string | null
  user_id:      string | null
}

export interface TeamAchievement {
  key:         string
  achieved_at: string
  metadata:    Record<string, unknown>
}

export type NudgePreset = 'lets_go' | 'keep_it_up' | 'you_got_this' | 'nice_work'

export interface Nudge {
  id:             string
  team_id:        string
  from_user_id:   string
  to_user_id:     string
  preset_key:     NudgePreset
  custom_message: string | null
  read_at:        string | null
  created_at:     string
  from_name:      string | null
}

export interface TeamSearchResult {
  id:           string
  name:         string
  member_count: number
  creator_name: string | null
}

export interface PendingRequest {
  user_id:      string
  display_name: string | null
  avatar_url:   string | null
  joined_at:    string
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
  pinch_hit_used:   boolean
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
  id:                   string
  user_id:              string
  start_date:           string
  end_date:             string | null
  is_current:           boolean
  created_at:           string
  success_definition:   string | null
  obstacle:             string | null
  length_weeks:         number | null
  season_goals:         SeasonGoal[]
  games:                FullGame[]
}
