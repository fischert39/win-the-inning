-- ============================================================
-- Win the Inning, Win the Day — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Profiles (extends auth.users, auto-created on Google sign-in)
create table if not exists public.profiles (
  id                   uuid references auth.users(id) on delete cascade primary key,
  display_name         text,
  avatar_url           text,
  sport                text default 'softball' check (sport in ('softball', 'baseball')),
  default_mind_task    text default '',
  default_spirit_task  text default '',
  default_body_task    text default '',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Migration: add default task columns if table already exists
alter table public.profiles add column if not exists default_mind_task    text default '';
alter table public.profiles add column if not exists default_spirit_task  text default '';
alter table public.profiles add column if not exists default_body_task    text default '';
alter table public.profiles add column if not exists default_offense_goals text default '[]';
alter table public.profiles add column if not exists username              text unique;
alter table public.innings  add column if not exists is_rain_delay         boolean default false;
-- v3 migrations: team, pinch hitter, season vision
alter table public.profiles add column if not exists team_name             text;
alter table public.profiles add column if not exists mascot                text;
alter table public.profiles add column if not exists pinch_hitter_tokens   integer default 0;
alter table public.profiles add column if not exists daily_bible_verse     boolean default false;
alter table public.innings  add column if not exists pinch_hit_used        boolean default false;
alter table public.seasons  add column if not exists success_definition    text;
alter table public.seasons  add column if not exists obstacle              text;
alter table public.seasons  add column if not exists length_weeks          integer default 12;
alter table public.profiles add column if not exists auto_carry_tasks      boolean default false;
-- v4 migrations: discoverability + social sharing
alter table public.profiles add column if not exists is_discoverable       boolean default false;
alter table public.profiles add column if not exists public_email          text;

-- ============================================================
-- User search: find discoverable players by name, username, or email
-- ============================================================
create or replace function public.search_users(p_query text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select json_agg(json_build_object(
      'username',     p.username,
      'display_name', p.display_name,
      'mascot',       p.mascot,
      'team_name',    p.team_name,
      'sport',        p.sport
    ))
    from public.profiles p
    where p.is_discoverable = true
      and p.username is not null
      and (
        lower(p.display_name) ilike '%' || lower(p_query) || '%'
        or lower(p.username)  ilike '%' || lower(p_query) || '%'
        or (p.public_email is not null and lower(p.public_email) ilike '%' || lower(p_query) || '%')
      )
    limit 20
  ), '[]'::json);
end;
$$;

grant execute on function public.search_users(text) to authenticated;

-- ============================================================
-- Friend comparison: privacy-safe public stats lookup by username
-- ============================================================
create or replace function public.get_friend_stats(p_username text)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_result  json;
begin
  select id into v_user_id
  from public.profiles
  where lower(username) = lower(p_username);

  if v_user_id is null then return null; end if;

  select json_build_object(
    'username',      p_username,
    'display_name',  (select display_name from public.profiles where id = v_user_id),
    'game_wins',    (select count(*) from public.games g
                     join public.seasons s on g.season_id = s.id
                     where g.user_id = v_user_id and s.is_current = true and g.result = 'WIN'),
    'game_losses',  (select count(*) from public.games g
                     join public.seasons s on g.season_id = s.id
                     where g.user_id = v_user_id and s.is_current = true and g.result = 'LOSS'),
    'innings_won',  (select count(*) from public.innings i
                     join public.games g on i.game_id = g.id
                     join public.seasons s on g.season_id = s.id
                     where i.user_id = v_user_id and s.is_current = true
                       and i.status = 'CLOSED' and i.result = 'WIN'),
    'innings_played',(select count(*) from public.innings i
                     join public.games g on i.game_id = g.id
                     join public.seasons s on g.season_id = s.id
                     where i.user_id = v_user_id and s.is_current = true
                       and i.status = 'CLOSED')
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_friend_stats(text) to authenticated;

-- ============================================================
-- Public profile: shareable stats card for /u/[username]
-- ============================================================
create or replace function public.get_public_profile(p_username text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid;
  v_result json;
begin
  select id into v_uid
  from public.profiles
  where lower(username) = lower(p_username);

  if v_uid is null then return null; end if;

  select json_build_object(
    'username',       lower(p_username),
    'display_name',   p.display_name,
    'team_name',      p.team_name,
    'mascot',         p.mascot,
    'sport',          p.sport,
    'game_wins',      (select count(*) from public.games g
                       join public.seasons s on g.season_id = s.id
                       where g.user_id = v_uid and s.is_current = true and g.result = 'WIN'),
    'game_losses',    (select count(*) from public.games g
                       join public.seasons s on g.season_id = s.id
                       where g.user_id = v_uid and s.is_current = true and g.result = 'LOSS'),
    'innings_won',    (select count(*) from public.innings i
                       join public.games g on i.game_id = g.id
                       join public.seasons s on g.season_id = s.id
                       where i.user_id = v_uid and s.is_current = true
                         and i.status = 'CLOSED' and i.result = 'WIN'),
    'innings_played', (select count(*) from public.innings i
                       join public.games g on i.game_id = g.id
                       join public.seasons s on g.season_id = s.id
                       where i.user_id = v_uid and s.is_current = true
                         and i.status = 'CLOSED' and not coalesce(i.is_rain_delay, false)),
    'recent_games',   (select json_agg(sub.result order by sub.week_start desc)
                       from (select g.result, g.week_start
                             from public.games g
                             join public.seasons s on g.season_id = s.id
                             where g.user_id = v_uid and s.is_current = true
                               and g.result != 'IN_PROGRESS'
                             order by g.week_start desc
                             limit 6) sub)
  ) into v_result
  from public.profiles p
  where p.id = v_uid;

  return v_result;
end;
$$;

grant execute on function public.get_public_profile(text) to anon;
grant execute on function public.get_public_profile(text) to authenticated;

-- Seasons
create table if not exists public.seasons (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  start_date  date not null,
  end_date    date,
  is_current  boolean default true,
  created_at  timestamptz default now()
);

-- Season Goals (big-picture goals for the season)
create table if not exists public.season_goals (
  id          text primary key,
  season_id   text references public.seasons(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  text        text default '',
  completed   boolean default false,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- Games (one per week)
create table if not exists public.games (
  id          text primary key,
  season_id   text references public.seasons(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  week_start  date not null,
  week_end    date not null,
  result      text default 'IN_PROGRESS'
);

-- Innings (one per day)
create table if not exists public.innings (
  id                text primary key,
  game_id           text references public.games(id) on delete cascade not null,
  user_id           uuid references auth.users(id) on delete cascade not null,
  date              date not null,
  inning_number     integer not null,
  status            text default 'IN_PROGRESS',
  target_goals      integer default 5,
  mind_task         text default '',
  mind_completed    boolean default false,
  spirit_task       text default '',
  spirit_completed  boolean default false,
  body_task         text default '',
  body_completed    boolean default false,
  reflection        text default '',
  future_goals      text default '',
  closed_at         timestamptz,
  result            text default 'IN_PROGRESS'
);

-- Offense Goals (individual goals/runs per inning)
create table if not exists public.offense_goals (
  id          text primary key,
  inning_id   text references public.innings(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  goal        text default '',
  completed   boolean default false,
  hit_type    text default 'single' check (hit_type in ('single', 'double', 'triple', 'homer')),
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- Row Level Security (users only see their own data)
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.seasons      enable row level security;
alter table public.season_goals enable row level security;
alter table public.games        enable row level security;
alter table public.innings      enable row level security;
alter table public.offense_goals enable row level security;

-- Profiles
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Seasons
create policy "seasons_select" on public.seasons for select using (auth.uid() = user_id);
create policy "seasons_insert" on public.seasons for insert with check (auth.uid() = user_id);
create policy "seasons_update" on public.seasons for update using (auth.uid() = user_id);
create policy "seasons_delete" on public.seasons for delete using (auth.uid() = user_id);

-- Season Goals
create policy "season_goals_select" on public.season_goals for select using (auth.uid() = user_id);
create policy "season_goals_insert" on public.season_goals for insert with check (auth.uid() = user_id);
create policy "season_goals_update" on public.season_goals for update using (auth.uid() = user_id);
create policy "season_goals_delete" on public.season_goals for delete using (auth.uid() = user_id);

-- Games
create policy "games_select" on public.games for select using (auth.uid() = user_id);
create policy "games_insert" on public.games for insert with check (auth.uid() = user_id);
create policy "games_update" on public.games for update using (auth.uid() = user_id);
create policy "games_delete" on public.games for delete using (auth.uid() = user_id);

-- Innings
create policy "innings_select" on public.innings for select using (auth.uid() = user_id);
create policy "innings_insert" on public.innings for insert with check (auth.uid() = user_id);
create policy "innings_update" on public.innings for update using (auth.uid() = user_id);
create policy "innings_delete" on public.innings for delete using (auth.uid() = user_id);

-- Offense Goals
create policy "offense_goals_select" on public.offense_goals for select using (auth.uid() = user_id);
create policy "offense_goals_insert" on public.offense_goals for insert with check (auth.uid() = user_id);
create policy "offense_goals_update" on public.offense_goals for update using (auth.uid() = user_id);
create policy "offense_goals_delete" on public.offense_goals for delete using (auth.uid() = user_id);

-- ============================================================
-- Auto-create profile on Google sign-in
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
