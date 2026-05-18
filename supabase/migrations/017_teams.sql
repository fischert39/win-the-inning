-- ============================================================
-- 017 Teams & Social Features
-- ============================================================

-- Groups of friends who root each other on
create table if not exists public.teams (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  invite_code  text not null unique default upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  created_by   uuid not null references auth.users(id) on delete cascade,
  is_public    boolean not null default false,
  created_at   timestamptz default now()
);

-- One team per user (enforced via unique on user_id)
create table if not exists public.team_members (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('admin', 'member')),
  status    text not null default 'active' check (status in ('active', 'pending')),
  joined_at timestamptz default now(),
  unique(user_id)
);

-- Link profile to team for fast RLS checks
alter table public.profiles add column if not exists group_team_id uuid references public.teams(id) on delete set null;

-- Quick reactions between teammates
create table if not exists public.nudges (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  from_user_id   uuid not null references auth.users(id) on delete cascade,
  to_user_id     uuid not null references auth.users(id) on delete cascade,
  preset_key     text not null check (preset_key in ('lets_go', 'keep_it_up', 'you_got_this', 'nice_work')),
  custom_message text,
  read_at        timestamptz,
  created_at     timestamptz default now()
);

-- Shared activity stream for each team
create table if not exists public.team_activity (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  type       text not null,
  metadata   jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Team-level accomplishments
create table if not exists public.team_achievements (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  key         text not null,
  achieved_at timestamptz default now(),
  metadata    jsonb not null default '{}',
  unique(team_id, key)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.teams             enable row level security;
alter table public.team_members      enable row level security;
alter table public.nudges            enable row level security;
alter table public.team_activity     enable row level security;
alter table public.team_achievements enable row level security;

-- teams: any authenticated user can read (needed for search/join by code)
create policy "teams_select"  on public.teams for select to authenticated using (true);
create policy "teams_insert"  on public.teams for insert with check (auth.uid() = created_by);
create policy "teams_update"  on public.teams for update using (
  auth.uid() = created_by or
  exists (
    select 1 from public.team_members
    where team_id = teams.id and user_id = auth.uid() and role = 'admin' and status = 'active'
  )
);
create policy "teams_delete"  on public.teams for delete using (auth.uid() = created_by);

-- team_members: see your own row + all members of your team (via profile.group_team_id)
create policy "team_members_select" on public.team_members for select using (
  auth.uid() = user_id or
  team_id = (select group_team_id from public.profiles where id = auth.uid())
);
create policy "team_members_insert" on public.team_members for insert with check (auth.uid() = user_id);
create policy "team_members_update" on public.team_members for update using (
  auth.uid() = user_id or
  team_id = (select group_team_id from public.profiles where id = auth.uid())
    and exists (
      select 1 from public.team_members admin_check
      where admin_check.team_id = team_members.team_id
        and admin_check.user_id = auth.uid()
        and admin_check.role = 'admin'
        and admin_check.status = 'active'
    )
);
create policy "team_members_delete" on public.team_members for delete using (
  auth.uid() = user_id or
  (
    team_id = (select group_team_id from public.profiles where id = auth.uid())
    and exists (
      select 1 from public.team_members admin_check
      where admin_check.team_id = team_members.team_id
        and admin_check.user_id = auth.uid()
        and admin_check.role = 'admin'
        and admin_check.status = 'active'
    )
  )
);

-- nudges: sender or recipient
create policy "nudges_select" on public.nudges for select using (
  auth.uid() = from_user_id or auth.uid() = to_user_id
);
create policy "nudges_insert" on public.nudges for insert with check (auth.uid() = from_user_id);
create policy "nudges_update" on public.nudges for update using (auth.uid() = to_user_id);

-- team_activity: active team members only (via profile.group_team_id)
create policy "team_activity_select" on public.team_activity for select using (
  team_id = (select group_team_id from public.profiles where id = auth.uid())
);
create policy "team_activity_insert" on public.team_activity for insert with check (
  team_id = (select group_team_id from public.profiles where id = auth.uid())
);

-- team_achievements: active team members
create policy "team_achievements_select" on public.team_achievements for select using (
  team_id = (select group_team_id from public.profiles where id = auth.uid())
);
create policy "team_achievements_insert" on public.team_achievements for insert with check (
  team_id = (select group_team_id from public.profiles where id = auth.uid())
);

-- ============================================================
-- Functions
-- ============================================================

-- Create a team and add creator as admin
create or replace function public.create_team(p_name text, p_is_public boolean default false)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_team_id  uuid;
  v_code     text;
begin
  select group_team_id into v_existing from public.profiles where id = auth.uid();
  if v_existing is not null then
    return json_build_object('error', 'already_on_team');
  end if;

  v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.teams (name, invite_code, created_by, is_public)
  values (trim(p_name), v_code, auth.uid(), p_is_public)
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role, status)
  values (v_team_id, auth.uid(), 'admin', 'active');

  update public.profiles set group_team_id = v_team_id where id = auth.uid();

  -- Post join event
  insert into public.team_activity (team_id, user_id, type, metadata)
  values (v_team_id, auth.uid(), 'member_joined',
    json_build_object('display_name',
      (select display_name from public.profiles where id = auth.uid())));

  return json_build_object('success', true, 'team_id', v_team_id, 'invite_code', v_code);
end;
$$;
grant execute on function public.create_team(text, boolean) to authenticated;

-- Join by 6-char invite code (instant, no approval needed)
create or replace function public.join_team_by_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id   uuid;
  v_team_name text;
  v_existing  uuid;
  v_count     int;
begin
  select id, name into v_team_id, v_team_name
  from public.teams
  where upper(invite_code) = upper(trim(p_code));

  if v_team_id is null then
    return json_build_object('error', 'invalid_code');
  end if;

  select count(*) into v_count
  from public.team_members
  where team_id = v_team_id and status = 'active';

  if v_count >= 10 then
    return json_build_object('error', 'team_full');
  end if;

  select group_team_id into v_existing from public.profiles where id = auth.uid();
  if v_existing is not null then
    return json_build_object('error', 'already_on_team');
  end if;

  insert into public.team_members (team_id, user_id, role, status)
  values (v_team_id, auth.uid(), 'member', 'active')
  on conflict (user_id) do update set team_id = v_team_id, status = 'active', joined_at = now();

  update public.profiles set group_team_id = v_team_id where id = auth.uid();

  insert into public.team_activity (team_id, user_id, type, metadata)
  values (v_team_id, auth.uid(), 'member_joined',
    json_build_object('display_name',
      (select display_name from public.profiles where id = auth.uid())));

  return json_build_object('success', true, 'team_id', v_team_id, 'team_name', v_team_name);
end;
$$;
grant execute on function public.join_team_by_code(text) to authenticated;

-- Request to join a public team (admin must approve)
create or replace function public.request_join_team(p_team_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_public boolean;
  v_count     int;
  v_existing  uuid;
begin
  select is_public into v_is_public from public.teams where id = p_team_id;
  if v_is_public is null then return json_build_object('error', 'not_found'); end if;
  if not v_is_public then return json_build_object('error', 'not_public'); end if;

  select count(*) into v_count
  from public.team_members where team_id = p_team_id and status = 'active';
  if v_count >= 10 then return json_build_object('error', 'team_full'); end if;

  select group_team_id into v_existing from public.profiles where id = auth.uid();
  if v_existing is not null then return json_build_object('error', 'already_on_team'); end if;

  insert into public.team_members (team_id, user_id, role, status)
  values (p_team_id, auth.uid(), 'member', 'pending')
  on conflict (user_id) do nothing;

  return json_build_object('success', true, 'status', 'pending');
end;
$$;
grant execute on function public.request_join_team(uuid) to authenticated;

-- Admin: approve or deny a join request
create or replace function public.handle_join_request(p_user_id uuid, p_approve boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_count   int;
begin
  select group_team_id into v_team_id from public.profiles where id = auth.uid();
  if v_team_id is null then return json_build_object('error', 'no_team'); end if;

  -- Verify caller is admin
  if not exists (
    select 1 from public.team_members
    where team_id = v_team_id and user_id = auth.uid() and role = 'admin' and status = 'active'
  ) then return json_build_object('error', 'not_admin'); end if;

  if p_approve then
    select count(*) into v_count
    from public.team_members where team_id = v_team_id and status = 'active';
    if v_count >= 10 then return json_build_object('error', 'team_full'); end if;

    update public.team_members
    set status = 'active', joined_at = now()
    where team_id = v_team_id and user_id = p_user_id and status = 'pending';

    update public.profiles set group_team_id = v_team_id where id = p_user_id;

    insert into public.team_activity (team_id, user_id, type, metadata)
    values (v_team_id, p_user_id, 'member_joined',
      json_build_object('display_name',
        (select display_name from public.profiles where id = p_user_id)));
  else
    delete from public.team_members
    where team_id = v_team_id and user_id = p_user_id and status = 'pending';
  end if;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.handle_join_request(uuid, boolean) to authenticated;

-- Leave team (or admin removes a member)
create or replace function public.leave_team(p_user_id uuid default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target  uuid;
  v_team_id uuid;
begin
  v_target := coalesce(p_user_id, auth.uid());
  select group_team_id into v_team_id from public.profiles where id = v_target;

  -- If removing someone else, verify caller is admin of same team
  if v_target != auth.uid() then
    if not exists (
      select 1 from public.team_members
      where team_id = v_team_id and user_id = auth.uid() and role = 'admin' and status = 'active'
    ) then return json_build_object('error', 'not_admin'); end if;
  end if;

  delete from public.team_members where user_id = v_target;
  update public.profiles set group_team_id = null where id = v_target;

  return json_build_object('success', true);
end;
$$;
grant execute on function public.leave_team(uuid) to authenticated;

-- Promote/demote member role (admin only)
create or replace function public.set_member_role(p_user_id uuid, p_role text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  if p_role not in ('admin', 'member') then
    return json_build_object('error', 'invalid_role');
  end if;

  select group_team_id into v_team_id from public.profiles where id = auth.uid();

  if not exists (
    select 1 from public.team_members
    where team_id = v_team_id and user_id = auth.uid() and role = 'admin' and status = 'active'
  ) then return json_build_object('error', 'not_admin'); end if;

  update public.team_members
  set role = p_role
  where team_id = v_team_id and user_id = p_user_id and status = 'active';

  return json_build_object('success', true);
end;
$$;
grant execute on function public.set_member_role(uuid, text) to authenticated;

-- Search public teams by name
create or replace function public.search_teams(p_query text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select json_agg(json_build_object(
      'id',           t.id,
      'name',         t.name,
      'member_count', (select count(*)::int from public.team_members tm
                       where tm.team_id = t.id and tm.status = 'active'),
      'creator_name', (select display_name from public.profiles where id = t.created_by)
    ))
    from public.teams t
    where t.is_public = true
      and lower(t.name) ilike '%' || lower(trim(p_query)) || '%'
    limit 10
  ), '[]'::json);
end;
$$;
grant execute on function public.search_teams(text) to authenticated;

-- Load current user's team (all info needed for TeamPage)
create or replace function public.get_my_team()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_role    text;
  v_status  text;
  v_result  json;
begin
  select tm.team_id, tm.role, tm.status
  into v_team_id, v_role, v_status
  from public.team_members tm
  where tm.user_id = auth.uid()
  limit 1;

  if v_team_id is null then return null; end if;

  select json_build_object(
    'id',            t.id,
    'name',          t.name,
    'invite_code',   case when v_role = 'admin' then t.invite_code else null end,
    'is_public',     t.is_public,
    'created_by',    t.created_by,
    'my_role',       v_role,
    'my_status',     v_status,
    'member_count',  (select count(*)::int from public.team_members
                      where team_id = t.id and status = 'active'),
    'pending_count', case when v_role = 'admin' then
                       (select count(*)::int from public.team_members
                        where team_id = t.id and status = 'pending')
                     else 0 end,
    'achievements',  coalesce((
                       select json_agg(json_build_object(
                         'key', key, 'achieved_at', achieved_at, 'metadata', metadata
                       ) order by achieved_at desc)
                       from public.team_achievements where team_id = t.id
                     ), '[]'::json)
  ) into v_result
  from public.teams t
  where t.id = v_team_id;

  return v_result;
end;
$$;
grant execute on function public.get_my_team() to authenticated;

-- Per-member scoreboard (scores only, no goal text)
create or replace function public.get_team_scoreboard(p_team_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and status = 'active'
  ) then return '[]'::json; end if;

  return coalesce((
    select json_agg(m order by (m->>'innings_won')::int desc nulls last)
    from (
      select json_build_object(
        'user_id',       tm.user_id,
        'display_name',  p.display_name,
        'avatar_url',    p.avatar_url,
        'mascot',        p.mascot,
        'team_name',     p.team_name,
        'role',          tm.role,
        'innings_won',   (select count(*)::int from public.innings i
                          join public.games g on i.game_id = g.id
                          join public.seasons s on g.season_id = s.id
                          where i.user_id = tm.user_id and s.is_current = true
                            and i.status = 'CLOSED' and i.result = 'WIN'),
        'innings_played',(select count(*)::int from public.innings i
                          join public.games g on i.game_id = g.id
                          join public.seasons s on g.season_id = s.id
                          where i.user_id = tm.user_id and s.is_current = true
                            and i.status = 'CLOSED'),
        'game_wins',     (select count(*)::int from public.games g
                          join public.seasons s on g.season_id = s.id
                          where g.user_id = tm.user_id and s.is_current = true
                            and g.result = 'WIN'),
        'game_losses',   (select count(*)::int from public.games g
                          join public.seasons s on g.season_id = s.id
                          where g.user_id = tm.user_id and s.is_current = true
                            and g.result = 'LOSS'),
        'win_streak',    (select count(*)::int from public.innings i_streak
                          join public.games g on i_streak.game_id = g.id
                          join public.seasons s on g.season_id = s.id
                          where i_streak.user_id = tm.user_id and s.is_current = true
                            and i_streak.status = 'CLOSED' and i_streak.result = 'WIN'
                            and i_streak.date > coalesce(
                              (select max(i_loss.date) from public.innings i_loss
                               where i_loss.user_id = tm.user_id and i_loss.status = 'CLOSED'
                                 and i_loss.result != 'WIN'),
                              '1900-01-01'::date
                            )),
        'today_status',  (select case
                            when count(*) = 0 then 'none'
                            when bool_or(status = 'CLOSED' and result = 'WIN') then 'won'
                            when bool_or(status = 'CLOSED') then 'closed'
                            else 'open'
                          end
                          from public.innings
                          where user_id = tm.user_id and date = current_date),
        'today_runs',    (select coalesce(
                            (select sum(case og.hit_type
                               when 'homer'  then 4
                               when 'triple' then 3
                               when 'double' then 2
                               else 1
                             end)::int
                             from public.innings i
                             join public.offense_goals og on og.inning_id = i.id
                             where i.user_id = tm.user_id and i.date = current_date
                               and og.completed = true), 0)
                         )
      ) as m
      from public.team_members tm
      join public.profiles p on p.id = tm.user_id
      where tm.team_id = p_team_id and tm.status = 'active'
    ) sub
  ), '[]'::json);
end;
$$;
grant execute on function public.get_team_scoreboard(uuid) to authenticated;

-- Team activity feed
create or replace function public.get_team_feed(p_team_id uuid, p_limit int default 40)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = auth.uid() and status = 'active'
  ) then return '[]'::json; end if;

  return coalesce((
    select json_agg(row_data order by (row_data->>'created_at') desc)
    from (
      select json_build_object(
        'id',           ta.id,
        'type',         ta.type,
        'metadata',     ta.metadata,
        'created_at',   ta.created_at,
        'display_name', p.display_name,
        'mascot',       p.mascot,
        'user_id',      ta.user_id
      ) as row_data
      from public.team_activity ta
      left join public.profiles p on p.id = ta.user_id
      where ta.team_id = p_team_id
      order by ta.created_at desc
      limit p_limit
    ) sub
  ), '[]'::json);
end;
$$;
grant execute on function public.get_team_feed(uuid, int) to authenticated;

-- Pending join requests (for admins)
create or replace function public.get_pending_requests()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
begin
  select group_team_id into v_team_id from public.profiles where id = auth.uid();
  if v_team_id is null then return '[]'::json; end if;

  if not exists (
    select 1 from public.team_members
    where team_id = v_team_id and user_id = auth.uid() and role = 'admin' and status = 'active'
  ) then return '[]'::json; end if;

  return coalesce((
    select json_agg(json_build_object(
      'user_id',      tm.user_id,
      'display_name', p.display_name,
      'avatar_url',   p.avatar_url,
      'joined_at',    tm.joined_at
    ))
    from public.team_members tm
    join public.profiles p on p.id = tm.user_id
    where tm.team_id = v_team_id and tm.status = 'pending'
  ), '[]'::json);
end;
$$;
grant execute on function public.get_pending_requests() to authenticated;

-- Check and award team achievements after an inning closes
create or replace function public.check_team_achievements(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_count int;
  v_all_won      boolean;
  v_ach_key      text;
  v_ach_id       uuid;
begin
  select count(*) into v_member_count
  from public.team_members where team_id = p_team_id and status = 'active';

  if v_member_count < 2 then return; end if;

  -- "Full Squad Win": all members closed their inning today with WIN
  select (count(*) = v_member_count) into v_all_won
  from public.team_members tm
  where tm.team_id = p_team_id and tm.status = 'active'
    and exists (
      select 1 from public.innings i
      where i.user_id = tm.user_id and i.date = current_date
        and i.status = 'CLOSED' and i.result = 'WIN'
    );

  if v_all_won then
    v_ach_key := 'full_squad_win_' || current_date::text;
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, v_ach_key,
      json_build_object('date', current_date::text, 'members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object(
          'key',     'full_squad_win',
          'label',   '🏆 Full Squad Win',
          'detail',  'Every teammate won their inning today!',
          'date',    current_date::text,
          'members', v_member_count
        ));
    end if;
  end if;

  -- "Clean Sweep": all members won their game this week
  select (count(*) = v_member_count) into v_all_won
  from public.team_members tm
  where tm.team_id = p_team_id and tm.status = 'active'
    and exists (
      select 1 from public.games g
      where g.user_id = tm.user_id
        and g.week_start = date_trunc('week', current_date)::date
        and g.result = 'WIN'
    );

  if v_all_won then
    v_ach_key := 'clean_sweep_' || date_trunc('week', current_date)::date::text;
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, v_ach_key,
      json_build_object('week', date_trunc('week', current_date)::date::text, 'members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object(
          'key',     'clean_sweep',
          'label',   '🧹 Clean Sweep',
          'detail',  'Every teammate won the game this week!',
          'week',    date_trunc('week', current_date)::date::text,
          'members', v_member_count
        ));
    end if;
  end if;
end;
$$;
grant execute on function public.check_team_achievements(uuid) to authenticated;

-- Count unread nudges for the current user
create or replace function public.get_unread_nudge_count()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*)::int into v_count
  from public.nudges
  where to_user_id = auth.uid() and read_at is null;
  return coalesce(v_count, 0);
end;
$$;
grant execute on function public.get_unread_nudge_count() to authenticated;

-- Mark all nudges as read for current user
create or replace function public.mark_nudges_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.nudges
  set read_at = now()
  where to_user_id = auth.uid() and read_at is null;
end;
$$;
grant execute on function public.mark_nudges_read() to authenticated;
