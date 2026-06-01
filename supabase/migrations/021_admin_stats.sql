-- ============================================================
-- 021_admin_stats.sql — server-side aggregation for the /admin dashboard
--
-- Replaces the previous approach of loading every innings/offense_goals row
-- into the Next.js server component and aggregating in JS. These two functions
-- do the rollups in Postgres and return compact results.
--
-- Security: these expose all-user data, so execute is granted ONLY to
-- service_role (the admin page calls them with the service-role key). PUBLIC /
-- anon / authenticated are revoked, so a normal logged-in user cannot call them.
--
-- Run this file in: Supabase Dashboard → SQL Editor → New Query.
-- ============================================================

-- ── Per-user aggregates ─────────────────────────────────────────────────────
-- One row per profile. Identity (email, joined-at) is joined in by the app from
-- auth.users; everything countable lives here.
create or replace function public.admin_user_stats()
returns table (
  user_id            uuid,
  display_name       text,
  username           text,
  sport              text,
  team_name          text,
  bible_verse        boolean,
  auto_carry         boolean,
  is_discoverable    boolean,
  last_active        timestamptz,
  total_seasons      int,
  active_seasons     int,
  total_games        int,
  games_won          int,
  games_lost         int,
  games_tied         int,
  total_innings      int,
  innings_won        int,
  rain_delay_innings int,
  total_goals        int,
  goals_completed    int,
  singles            int,
  doubles            int,
  triples            int,
  homers             int,
  mind_total         int,
  mind_done          int,
  spirit_total       int,
  spirit_done        int,
  body_total         int,
  body_done          int
)
language sql
security definer
set search_path = public
as $$
  with season_agg as (
    select user_id,
           count(*)::int                              as total_seasons,
           count(*) filter (where is_current)::int    as active_seasons
    from seasons
    group by user_id
  ),
  game_agg as (
    select user_id,
           count(*)::int                              as total_games,
           count(*) filter (where result = 'WIN')::int  as games_won,
           count(*) filter (where result = 'LOSS')::int as games_lost,
           count(*) filter (where result = 'TIE')::int  as games_tied
    from games
    group by user_id
  ),
  -- Inning rollups consider CLOSED innings only, matching the dashboard.
  inning_agg as (
    select user_id,
           count(*)::int                                  as total_innings,
           count(*) filter (where result = 'WIN')::int    as innings_won,
           count(*) filter (where is_rain_delay)::int     as rain_delay_innings,
           max(closed_at)                                 as last_active,
           count(*) filter (where coalesce(mind_task,'')   <> '')::int                            as mind_total,
           count(*) filter (where coalesce(mind_task,'')   <> '' and mind_completed)::int         as mind_done,
           count(*) filter (where coalesce(spirit_task,'') <> '')::int                            as spirit_total,
           count(*) filter (where coalesce(spirit_task,'') <> '' and spirit_completed)::int       as spirit_done,
           count(*) filter (where coalesce(body_task,'')   <> '')::int                            as body_total,
           count(*) filter (where coalesce(body_task,'')   <> '' and body_completed)::int         as body_done
    from innings
    where status = 'CLOSED'
    group by user_id
  ),
  -- Goal rollups count ALL goals (hit-type breakdown is not gated on completed),
  -- matching the dashboard's per-user and global goal aggregates.
  goal_agg as (
    select user_id,
           count(*)::int                                  as total_goals,
           count(*) filter (where completed)::int         as goals_completed,
           count(*) filter (where hit_type = 'single')::int as singles,
           count(*) filter (where hit_type = 'double')::int as doubles,
           count(*) filter (where hit_type = 'triple')::int as triples,
           count(*) filter (where hit_type = 'homer')::int  as homers
    from offense_goals
    group by user_id
  )
  select
    p.id,
    p.display_name,
    p.username,
    p.sport,
    p.team_name,
    coalesce(p.daily_bible_verse, false),
    coalesce(p.auto_carry_tasks,  false),
    coalesce(p.is_discoverable,   false),
    ia.last_active,
    coalesce(sa.total_seasons, 0),
    coalesce(sa.active_seasons, 0),
    coalesce(ga.total_games, 0),
    coalesce(ga.games_won, 0),
    coalesce(ga.games_lost, 0),
    coalesce(ga.games_tied, 0),
    coalesce(ia.total_innings, 0),
    coalesce(ia.innings_won, 0),
    coalesce(ia.rain_delay_innings, 0),
    coalesce(goa.total_goals, 0),
    coalesce(goa.goals_completed, 0),
    coalesce(goa.singles, 0),
    coalesce(goa.doubles, 0),
    coalesce(goa.triples, 0),
    coalesce(goa.homers, 0),
    coalesce(ia.mind_total, 0),
    coalesce(ia.mind_done, 0),
    coalesce(ia.spirit_total, 0),
    coalesce(ia.spirit_done, 0),
    coalesce(ia.body_total, 0),
    coalesce(ia.body_done, 0)
  from profiles p
  left join season_agg sa  on sa.user_id  = p.id
  left join game_agg   ga  on ga.user_id  = p.id
  left join inning_agg ia  on ia.user_id  = p.id
  left join goal_agg   goa on goa.user_id = p.id;
$$;

-- ── Global rollups (DB-derived) ─────────────────────────────────────────────
-- User-count / signup metrics come from auth.users in the app layer; this
-- returns everything derivable from the data tables, as a single JSON object.
create or replace function public.admin_global_stats()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'totalSeasons',     (select count(*) from seasons),
    'activeSeasons',    (select count(*) from seasons where is_current),

    'totalGames',       (select count(*) from games),
    'gamesWon',         (select count(*) from games where result = 'WIN'),
    'gamesLost',        (select count(*) from games where result = 'LOSS'),
    'gamesTied',        (select count(*) from games where result = 'TIE'),
    'gamesInProgress',  (select count(*) from games where result = 'IN_PROGRESS'),

    'totalInnings',     (select count(*) from innings where status = 'CLOSED'),
    'inningsWon',       (select count(*) from innings where status = 'CLOSED' and result = 'WIN'),
    'rainDelayInnings', (select count(*) from innings where status = 'CLOSED' and is_rain_delay),

    'activeThisWeek',   (select count(distinct user_id) from innings where status = 'CLOSED' and closed_at >= now() - interval '7 days'),
    'activeThisMonth',  (select count(distinct user_id) from innings where status = 'CLOSED' and closed_at >= now() - interval '30 days'),

    'totalGoals',       (select count(*) from offense_goals),
    'goalsCompleted',   (select count(*) from offense_goals where completed),
    'singles',          (select count(*) from offense_goals where hit_type = 'single'),
    'doubles',          (select count(*) from offense_goals where hit_type = 'double'),
    'triples',          (select count(*) from offense_goals where hit_type = 'triple'),
    'homers',           (select count(*) from offense_goals where hit_type = 'homer'),

    'mindTotal',        (select count(*) from innings where status = 'CLOSED' and coalesce(mind_task,'')   <> ''),
    'mindCompleted',    (select count(*) from innings where status = 'CLOSED' and coalesce(mind_task,'')   <> '' and mind_completed),
    'spiritTotal',      (select count(*) from innings where status = 'CLOSED' and coalesce(spirit_task,'') <> ''),
    'spiritCompleted',  (select count(*) from innings where status = 'CLOSED' and coalesce(spirit_task,'') <> '' and spirit_completed),
    'bodyTotal',        (select count(*) from innings where status = 'CLOSED' and coalesce(body_task,'')   <> ''),
    'bodyCompleted',    (select count(*) from innings where status = 'CLOSED' and coalesce(body_task,'')   <> '' and body_completed),

    'bibleVerseUsers',   (select count(*) from profiles where daily_bible_verse),
    'autoCarryUsers',    (select count(*) from profiles where auto_carry_tasks),
    'discoverableUsers', (select count(*) from profiles where is_discoverable),
    'usernameSetUsers',  (select count(*) from profiles where username is not null)
  );
$$;

-- ── Permissions: service_role only ──────────────────────────────────────────
revoke all on function public.admin_user_stats()   from public, anon, authenticated;
revoke all on function public.admin_global_stats() from public, anon, authenticated;
grant execute on function public.admin_user_stats()   to service_role;
grant execute on function public.admin_global_stats() to service_role;
