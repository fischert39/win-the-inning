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
