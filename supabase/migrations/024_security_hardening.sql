-- ============================================================
-- 024: Security & performance hardening (July 2026 audit)
--
-- 1. Pin search_path on the two functions the linter flags as mutable.
-- 2. Revoke anon EXECUTE on SECURITY DEFINER RPCs. Every function checks
--    auth.uid() internally, so this is defense-in-depth; only
--    get_public_profile and get_team_by_code are meant for logged-out
--    visitors (/u/[username] and /join/[code]).
-- 3. Wrap auth.uid() as (select auth.uid()) in all RLS policies so it is
--    evaluated once per query instead of once per row.
-- 4. Tighten nudges_insert: a nudge row may only target an active member
--    of the sender's own team (mirrors the /api/nudge check).
-- 5. Add covering indexes for every foreign key, plus (status, date) on
--    innings for the weekly finalize cron.
-- ============================================================

-- ── 0. get_public_profile was only ever in schema.sql, never applied to
--       prod (discovered when this migration first ran) — /u/[username]
--       404'd for every username as a result. Definition from schema.sql.
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

-- ── 1. Pin search_path ──────────────────────────────────────
alter function public.handle_new_user() set search_path = public;
alter function public.get_friend_stats(text) set search_path = public;

-- ── 2. Function EXECUTE grants ───────────────────────────────
-- Trigger-only function: nothing should call it over the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Authenticated-only RPCs.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.check_team_achievements(uuid)',
    'public.create_team(text, boolean)',
    'public.get_activity_feed(integer)',
    'public.get_friend_stats(text)',
    'public.get_my_team()',
    'public.get_pending_requests()',
    'public.get_team_feed(uuid, integer)',
    'public.get_team_scoreboard(uuid)',
    'public.get_unread_nudge_count()',
    'public.handle_join_request(uuid, boolean)',
    'public.join_team_by_code(text)',
    'public.leave_team(uuid)',
    'public.mark_nudges_read()',
    'public.request_join_team(uuid)',
    'public.search_teams(text)',
    'public.search_users(text)',
    'public.set_member_role(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated, service_role', fn);
  end loop;
end $$;

-- Intentionally public (logged-out pages use these): pin grants explicitly.
revoke execute on function public.get_public_profile(text) from public;
grant  execute on function public.get_public_profile(text) to anon, authenticated, service_role;
revoke execute on function public.get_team_by_code(text) from public;
grant  execute on function public.get_team_by_code(text) to anon, authenticated, service_role;

-- ── 3. RLS: evaluate auth.uid() once per query ───────────────
-- profiles
alter policy "profiles_select" on public.profiles using ((select auth.uid()) = id);
alter policy "profiles_insert" on public.profiles with check ((select auth.uid()) = id);
alter policy "profiles_update" on public.profiles using ((select auth.uid()) = id);

-- seasons
alter policy "seasons_select" on public.seasons using ((select auth.uid()) = user_id);
alter policy "seasons_insert" on public.seasons with check ((select auth.uid()) = user_id);
alter policy "seasons_update" on public.seasons using ((select auth.uid()) = user_id);
alter policy "seasons_delete" on public.seasons using ((select auth.uid()) = user_id);

-- season_goals
alter policy "season_goals_select" on public.season_goals using ((select auth.uid()) = user_id);
alter policy "season_goals_insert" on public.season_goals with check ((select auth.uid()) = user_id);
alter policy "season_goals_update" on public.season_goals using ((select auth.uid()) = user_id);
alter policy "season_goals_delete" on public.season_goals using ((select auth.uid()) = user_id);

-- games
alter policy "games_select" on public.games using ((select auth.uid()) = user_id);
alter policy "games_insert" on public.games with check ((select auth.uid()) = user_id);
alter policy "games_update" on public.games using ((select auth.uid()) = user_id);
alter policy "games_delete" on public.games using ((select auth.uid()) = user_id);

-- innings
alter policy "innings_select" on public.innings using ((select auth.uid()) = user_id);
alter policy "innings_insert" on public.innings with check ((select auth.uid()) = user_id);
alter policy "innings_update" on public.innings using ((select auth.uid()) = user_id);
alter policy "innings_delete" on public.innings using ((select auth.uid()) = user_id);

-- offense_goals
alter policy "offense_goals_select" on public.offense_goals using ((select auth.uid()) = user_id);
alter policy "offense_goals_insert" on public.offense_goals with check ((select auth.uid()) = user_id);
alter policy "offense_goals_update" on public.offense_goals using ((select auth.uid()) = user_id);
alter policy "offense_goals_delete" on public.offense_goals using ((select auth.uid()) = user_id);

-- push_subscriptions
alter policy "Users manage own subscriptions" on public.push_subscriptions
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- teams
alter policy "teams_insert" on public.teams with check ((select auth.uid()) = created_by);
alter policy "teams_delete" on public.teams using ((select auth.uid()) = created_by);
alter policy "teams_update" on public.teams using (
  (select auth.uid()) = created_by or
  exists (
    select 1 from public.team_members
    where team_members.team_id = teams.id
      and team_members.user_id = (select auth.uid())
      and team_members.role = 'admin'
      and team_members.status = 'active'
  )
);

-- team_members
alter policy "team_members_select" on public.team_members using (
  (select auth.uid()) = user_id or
  team_id = (select group_team_id from public.profiles where id = (select auth.uid()))
);
alter policy "team_members_insert" on public.team_members with check ((select auth.uid()) = user_id);
alter policy "team_members_update" on public.team_members using (
  (select auth.uid()) = user_id or (
    team_id = (select group_team_id from public.profiles where id = (select auth.uid()))
    and exists (
      select 1 from public.team_members admin_check
      where admin_check.team_id = team_members.team_id
        and admin_check.user_id = (select auth.uid())
        and admin_check.role = 'admin'
        and admin_check.status = 'active'
    )
  )
);
alter policy "team_members_delete" on public.team_members using (
  (select auth.uid()) = user_id or (
    team_id = (select group_team_id from public.profiles where id = (select auth.uid()))
    and exists (
      select 1 from public.team_members admin_check
      where admin_check.team_id = team_members.team_id
        and admin_check.user_id = (select auth.uid())
        and admin_check.role = 'admin'
        and admin_check.status = 'active'
    )
  )
);

-- nudges
alter policy "nudges_select" on public.nudges using (
  (select auth.uid()) = from_user_id or (select auth.uid()) = to_user_id
);
alter policy "nudges_update" on public.nudges using ((select auth.uid()) = to_user_id);

-- ── 4. nudges_insert: teammates only ─────────────────────────
alter policy "nudges_insert" on public.nudges with check (
  (select auth.uid()) = from_user_id
  and exists (
    select 1
    from public.team_members sender
    join public.team_members recipient on recipient.team_id = sender.team_id
    where sender.user_id = (select auth.uid())
      and recipient.user_id = nudges.to_user_id
      and sender.status = 'active'
      and recipient.status = 'active'
      and sender.team_id = nudges.team_id
  )
);

-- team_activity
alter policy "team_activity_select" on public.team_activity using (
  team_id = (select group_team_id from public.profiles where id = (select auth.uid()))
);
alter policy "team_activity_insert" on public.team_activity with check (
  team_id = (select group_team_id from public.profiles where id = (select auth.uid()))
);

-- team_achievements
alter policy "team_achievements_select" on public.team_achievements using (
  team_id = (select group_team_id from public.profiles where id = (select auth.uid()))
);
alter policy "team_achievements_insert" on public.team_achievements with check (
  team_id = (select group_team_id from public.profiles where id = (select auth.uid()))
);

-- ── 5. Indexes ────────────────────────────────────────────────
create index if not exists idx_games_season_id         on public.games(season_id);
create index if not exists idx_games_user_id           on public.games(user_id);
create index if not exists idx_innings_game_id         on public.innings(game_id);
create index if not exists idx_innings_user_id         on public.innings(user_id);
create index if not exists idx_innings_status_date     on public.innings(status, date);
create index if not exists idx_offense_goals_inning_id on public.offense_goals(inning_id);
create index if not exists idx_offense_goals_user_id   on public.offense_goals(user_id);
create index if not exists idx_season_goals_season_id  on public.season_goals(season_id);
create index if not exists idx_season_goals_user_id    on public.season_goals(user_id);
create index if not exists idx_seasons_user_id         on public.seasons(user_id);
create index if not exists idx_nudges_from_created     on public.nudges(from_user_id, created_at);
create index if not exists idx_nudges_to_user_id       on public.nudges(to_user_id);
create index if not exists idx_nudges_team_id          on public.nudges(team_id);
create index if not exists idx_team_activity_team_id   on public.team_activity(team_id);
create index if not exists idx_team_activity_user_id   on public.team_activity(user_id);
create index if not exists idx_team_members_team_id    on public.team_members(team_id);
create index if not exists idx_teams_created_by        on public.teams(created_by);
create index if not exists idx_profiles_group_team_id  on public.profiles(group_team_id);
