-- Team scoring that agrees with the app
--
-- Supersedes 019_team_achievements.sql, which was never applied to production
-- (only 2 of the 10 team achievements existed in the database).
--
-- Also teaches the server-side scoreboards the rules the app gained this season:
--   * the pre-season warm-up week never counts
--   * rain delays aren't innings played
--   * runs come from running the bases, not from adding up hit values
--   * "today" is the player's local date, not UTC
--
-- Every function created here is locked down explicitly: a brand-new Postgres
-- function is executable by everyone (including signed-out visitors) by default,
-- which would silently undo 024_security_hardening.

-- ─── Internal helpers ───────────────────────────────────────────────────────

-- True when a game is the partial warm-up week of a season started mid-week.
create or replace function public.is_pre_season_game(p_season_start date, p_week_start date)
returns boolean
language sql immutable
set search_path = public
as $$
  select p_season_start <> date_trunc('week', p_season_start)::date
     and p_week_start   =  date_trunc('week', p_season_start)::date
$$;

-- A player's calendar date in their own timezone (UTC if unknown or invalid).
create or replace function public.local_date_for(p_tz text)
returns date
language plpgsql stable
set search_path = public
as $$
begin
  return (now() at time zone coalesce(nullif(p_tz, ''), 'UTC'))::date;
exception when others then
  return current_date;
end;
$$;

-- Runs scored in an inning — the same base-running simulation as the app's
-- simulateRuns(), applied to completed goals in lineup order.
create or replace function public.inning_runs(p_inning_id text)
returns int
language plpgsql stable
set search_path = public
as $$
declare
  b1 boolean := false; b2 boolean := false; b3 boolean := false;
  v_runs int := 0;
  v_hit  text;
begin
  for v_hit in
    select hit_type from public.offense_goals
    where inning_id = p_inning_id and completed
    order by sort_order, id
  loop
    if v_hit = 'homer' then
      v_runs := v_runs + b1::int + b2::int + b3::int + 1;
      b1 := false; b2 := false; b3 := false;
    elsif v_hit = 'double' then
      v_runs := v_runs + b3::int + b2::int;
      b3 := b1; b2 := true; b1 := false;
    elsif v_hit = 'triple' then
      v_runs := v_runs + b3::int + b2::int + b1::int;
      b3 := true; b2 := false; b1 := false;
    else  -- single
      v_runs := v_runs + b3::int;
      b3 := b2; b2 := b1; b1 := true;
    end if;
  end loop;
  return v_runs;
end;
$$;

-- A player's innings in their current season, excluding pre-season.
create or replace function public.current_season_innings(p_user_id uuid)
returns table (id text, date date, status text, result text, is_rain_delay boolean,
               mind_completed boolean, spirit_completed boolean, body_completed boolean)
language sql stable
set search_path = public
as $$
  select i.id, i.date, i.status, i.result, coalesce(i.is_rain_delay, false),
         i.mind_completed, i.spirit_completed, i.body_completed
  from public.innings i
  join public.games   g on g.id = i.game_id
  join public.seasons s on s.id = g.season_id
  where i.user_id = p_user_id and s.is_current
    and not public.is_pre_season_game(s.start_date, g.week_start)
$$;

-- A player's games in their current season, excluding pre-season.
create or replace function public.current_season_games(p_user_id uuid)
returns table (week_start date, result text)
language sql stable
set search_path = public
as $$
  select g.week_start, g.result
  from public.games g
  join public.seasons s on s.id = g.season_id
  where g.user_id = p_user_id and s.is_current
    and not public.is_pre_season_game(s.start_date, g.week_start)
$$;

-- Records an achievement once and posts it to the team feed the first time.
create or replace function public.award_team_achievement(
  p_team_id uuid, p_key text, p_kind text, p_label text, p_detail text,
  p_meta jsonb default '{}'::jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.team_achievements (team_id, key, metadata)
  values (p_team_id, p_key, p_meta)
  on conflict (team_id, key) do nothing
  returning id into v_id;

  if v_id is not null then
    insert into public.team_activity (team_id, user_id, type, metadata)
    values (p_team_id, null, 'achievement_unlocked',
      jsonb_build_object('key', p_kind, 'label', p_label, 'detail', p_detail) || p_meta);
  end if;
end;
$$;

-- ─── Team achievements (all 10) ─────────────────────────────────────────────

-- The old single-argument version is replaced by one that takes the inning's
-- date, so "today" means the day the player actually closed.
drop function if exists public.check_team_achievements(uuid);

create or replace function public.check_team_achievements(p_team_id uuid, p_date date default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_members int;
  v_day     date := p_date;
  v_week    date;
begin
  -- Only a member can trigger checks for their own team.
  if not exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = (select auth.uid()) and status = 'active'
  ) then return; end if;

  -- Accept a recent date only; anything else falls back to today.
  if v_day is null or v_day > current_date + 1 or v_day < current_date - 7 then
    v_day := current_date;
  end if;
  v_week := date_trunc('week', v_day)::date;

  select count(*) into v_members
  from public.team_members where team_id = p_team_id and status = 'active';
  if v_members < 2 then return; end if;

  -- 1. Full Squad Win — every member won their inning that day
  if (select count(*) from public.team_members tm
      where tm.team_id = p_team_id and tm.status = 'active'
        and exists (select 1 from public.current_season_innings(tm.user_id) ci
                    where ci.date = v_day and ci.status = 'CLOSED' and ci.result = 'WIN')
     ) = v_members then
    perform public.award_team_achievement(p_team_id, 'full_squad_win_' || v_day, 'full_squad_win',
      '🏆 Full Squad Win', 'Every teammate won their inning today!',
      jsonb_build_object('date', v_day::text, 'members', v_members));
  end if;

  -- 2. Clean Sweep — every member won that week's game
  if (select count(*) from public.team_members tm
      where tm.team_id = p_team_id and tm.status = 'active'
        and exists (select 1 from public.current_season_games(tm.user_id) cg
                    where cg.week_start = v_week and cg.result = 'WIN')
     ) = v_members then
    perform public.award_team_achievement(p_team_id, 'clean_sweep_' || v_week, 'clean_sweep',
      '🧹 Clean Sweep', 'Every teammate won the game this week!',
      jsonb_build_object('week', v_week::text, 'members', v_members));
  end if;

  -- 3. Lockdown — every member recorded all three outs that day
  if (select count(*) from public.team_members tm
      where tm.team_id = p_team_id and tm.status = 'active'
        and exists (select 1 from public.current_season_innings(tm.user_id) ci
                    where ci.date = v_day and ci.status = 'CLOSED'
                      and ci.mind_completed and ci.spirit_completed and ci.body_completed)
     ) = v_members then
    perform public.award_team_achievement(p_team_id, 'lockdown_' || v_day, 'lockdown',
      '🛡️ Lockdown', 'Every teammate completed all 3 defense tasks today!',
      jsonb_build_object('date', v_day::text, 'members', v_members));
  end if;

  -- 4. Squad on Fire — every member is on a 3+ inning win streak
  if (select count(*) from public.team_members tm
      where tm.team_id = p_team_id and tm.status = 'active'
        and (select count(*) from public.current_season_innings(tm.user_id) w
             where w.status = 'CLOSED' and w.result = 'WIN'
               and w.date > coalesce(
                 (select max(b.date) from public.current_season_innings(tm.user_id) b
                  where b.status = 'CLOSED' and b.result <> 'WIN'), '1900-01-01'::date)
            ) >= 3
     ) = v_members then
    perform public.award_team_achievement(p_team_id, 'squad_on_fire_' || v_day, 'squad_on_fire',
      '🔥 Squad on Fire', 'Every teammate is on a 3+ day win streak!',
      jsonb_build_object('date', v_day::text, 'members', v_members));
  end if;

  -- 5. Three-Peat — Full Squad Win earned on 3 different days
  if (select count(*) from public.team_achievements
      where team_id = p_team_id and key like 'full_squad_win\_%') >= 3 then
    perform public.award_team_achievement(p_team_id, 'three_peat', 'three_peat',
      '🎯 Three-Peat', 'The whole squad has won together 3 times!',
      jsonb_build_object('members', v_members));
  end if;

  -- 6. Century Club — 100 runs scored across the team this season
  if coalesce((
      select sum(public.inning_runs(ci.id))
      from public.team_members tm
      cross join lateral public.current_season_innings(tm.user_id) ci
      where tm.team_id = p_team_id and tm.status = 'active'
    ), 0) >= 100 then
    perform public.award_team_achievement(p_team_id, 'century_club', 'century_club',
      '💯 Century Club', 'Team has collectively scored 100 runs!',
      jsonb_build_object('members', v_members));
  end if;

  -- 7. All-Stars — every member has won 10+ innings this season
  if (select count(*) from public.team_members tm
      where tm.team_id = p_team_id and tm.status = 'active'
        and (select count(*) from public.current_season_innings(tm.user_id) ci
             where ci.status = 'CLOSED' and ci.result = 'WIN') >= 10
     ) = v_members then
    perform public.award_team_achievement(p_team_id, 'all_stars', 'all_stars',
      '🌟 All-Stars', 'Every teammate has won 10+ innings this season!',
      jsonb_build_object('members', v_members));
  end if;

  -- 8. Perfect Formation — every member went 7-for-7 in the same week
  if exists (
    select 1
    from public.team_members tm
    cross join lateral public.current_season_innings(tm.user_id) ci
    where tm.team_id = p_team_id and tm.status = 'active'
    group by date_trunc('week', ci.date)
    having count(distinct tm.user_id) = v_members
       and count(*) filter (where ci.status = 'CLOSED' and ci.result = 'WIN' and not ci.is_rain_delay)
           = 7 * v_members
  ) then
    perform public.award_team_achievement(p_team_id, 'perfect_formation', 'perfect_formation',
      '💎 Perfect Formation', 'Every teammate went 7-for-7 in the same week!',
      jsonb_build_object('members', v_members));
  end if;
end;
$$;

-- 9 & 10. Membership milestones, checked when someone joins.
create or replace function public.check_team_membership_achievements(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.team_members where team_id = p_team_id and status = 'active';

  if v_count >= 5 then
    perform public.award_team_achievement(p_team_id, 'founding_five', 'founding_five',
      '🤝 Founding Five', 'Team has grown to 5 members!', jsonb_build_object('members', v_count));
  end if;
  if v_count >= 10 then
    perform public.award_team_achievement(p_team_id, 'full_roster', 'full_roster',
      '👥 Full Roster', 'Team is at full capacity — 10 members!', jsonb_build_object('members', v_count));
  end if;
end;
$$;

-- Joining (by code or by approval) now checks the membership milestones.
-- Bodies are otherwise identical to the versions currently in production.
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

  perform public.check_team_membership_achievements(v_team_id);

  return json_build_object('success', true, 'team_id', v_team_id, 'team_name', v_team_name);
end;
$$;

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

    perform public.check_team_membership_achievements(v_team_id);
  else
    delete from public.team_members
    where team_id = v_team_id and user_id = p_user_id and status = 'pending';
  end if;

  return json_build_object('success', true);
end;
$$;

-- ─── Scoreboards ────────────────────────────────────────────────────────────

create or replace function public.get_team_scoreboard(p_team_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.team_members
    where team_id = p_team_id and user_id = (select auth.uid()) and status = 'active'
  ) then return '[]'::json; end if;

  return coalesce((
    select json_agg(row_to_json(m) order by m.innings_won desc nulls last)
    from (
      select
        tm.user_id, p.display_name, p.avatar_url, p.mascot, p.team_name, tm.role,
        (select count(*)::int from public.current_season_innings(tm.user_id) ci
          where ci.status = 'CLOSED' and ci.result = 'WIN')                        as innings_won,
        (select count(*)::int from public.current_season_innings(tm.user_id) ci
          where ci.status = 'CLOSED' and not ci.is_rain_delay)                     as innings_played,
        (select count(*)::int from public.current_season_games(tm.user_id) cg
          where cg.result = 'WIN')                                                  as game_wins,
        (select count(*)::int from public.current_season_games(tm.user_id) cg
          where cg.result = 'LOSS')                                                 as game_losses,
        (select count(*)::int from public.current_season_innings(tm.user_id) w
          where w.status = 'CLOSED' and w.result = 'WIN'
            and w.date > coalesce(
              (select max(b.date) from public.current_season_innings(tm.user_id) b
               where b.status = 'CLOSED' and b.result <> 'WIN'), '1900-01-01'::date)) as win_streak,
        (select case
            when count(*) = 0 then 'none'
            when bool_or(i.status = 'CLOSED' and i.result = 'WIN') then 'won'
            when bool_or(i.status = 'CLOSED') then 'closed'
            else 'open'
          end
         from public.innings i
         join public.games   g on g.id = i.game_id
         join public.seasons s on s.id = g.season_id
         where i.user_id = tm.user_id and s.is_current
           and i.date = public.local_date_for(p.timezone))                         as today_status,
        (select coalesce(sum(public.inning_runs(i.id)), 0)::int
         from public.innings i
         join public.games   g on g.id = i.game_id
         join public.seasons s on s.id = g.season_id
         where i.user_id = tm.user_id and s.is_current
           and i.date = public.local_date_for(p.timezone))                         as today_runs
      from public.team_members tm
      join public.profiles p on p.id = tm.user_id
      where tm.team_id = p_team_id and tm.status = 'active'
    ) m
  ), '[]'::json);
end;
$$;

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
  select id into v_uid from public.profiles where lower(username) = lower(p_username);
  if v_uid is null then return null; end if;

  select json_build_object(
    'username',       lower(p_username),
    'display_name',   p.display_name,
    'team_name',      p.team_name,
    'mascot',         p.mascot,
    'sport',          p.sport,
    'game_wins',      (select count(*) from public.current_season_games(v_uid) cg where cg.result = 'WIN'),
    'game_losses',    (select count(*) from public.current_season_games(v_uid) cg where cg.result = 'LOSS'),
    'innings_won',    (select count(*) from public.current_season_innings(v_uid) ci
                       where ci.status = 'CLOSED' and ci.result = 'WIN'),
    'innings_played', (select count(*) from public.current_season_innings(v_uid) ci
                       where ci.status = 'CLOSED' and not ci.is_rain_delay),
    'recent_games',   (select json_agg(sub.result order by sub.week_start desc)
                       from (select cg.result, cg.week_start
                             from public.current_season_games(v_uid) cg
                             where cg.result <> 'IN_PROGRESS'
                             order by cg.week_start desc
                             limit 6) sub)
  ) into v_result
  from public.profiles p
  where p.id = v_uid;

  return v_result;
end;
$$;

-- ─── Permissions ────────────────────────────────────────────────────────────

-- Internal helpers: callable only from the security-definer functions above.
revoke all on function public.is_pre_season_game(date, date)               from public, anon, authenticated;
revoke all on function public.local_date_for(text)                          from public, anon, authenticated;
revoke all on function public.inning_runs(text)                             from public, anon, authenticated;
revoke all on function public.current_season_innings(uuid)                  from public, anon, authenticated;
revoke all on function public.current_season_games(uuid)                    from public, anon, authenticated;
revoke all on function public.award_team_achievement(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.check_team_membership_achievements(uuid)      from public, anon, authenticated;

-- Signed-in players only.
revoke all on function public.check_team_achievements(uuid, date) from public, anon;
grant execute on function public.check_team_achievements(uuid, date) to authenticated;

-- Unchanged exposure for the replaced functions (create or replace keeps
-- existing grants; restated so this file is correct on a fresh database).
revoke all on function public.join_team_by_code(text)                from public, anon;
revoke all on function public.handle_join_request(uuid, boolean)     from public, anon;
revoke all on function public.get_team_scoreboard(uuid)              from public, anon;
grant execute on function public.join_team_by_code(text)             to authenticated;
grant execute on function public.handle_join_request(uuid, boolean)  to authenticated;
grant execute on function public.get_team_scoreboard(uuid)           to authenticated;
grant execute on function public.get_public_profile(text)            to anon, authenticated;
