-- Close the team-takeover hole (October 2026 audit)
--
-- Proven in a rolled-back test: any signed-in player could read every team and
-- its invite code, read any team's feed by pointing their own profile at it,
-- insert themselves into any team as an admin, and post feed items in a
-- teammate's name.
--
-- Root causes:
--   1. profiles.group_team_id was writable by its owner, yet every team policy
--      trusts it as proof of membership.
--   2. team_members / teams / team_achievements accepted direct writes, which
--      bypassed the invite code, the 10-member cap and admin approval.
--   3. team_activity accepted any user_id and any type.
--
-- The app never writes those team tables directly — joining, leaving, roles and
-- achievements all go through SECURITY DEFINER functions, which run as the
-- table owner and are unaffected by the policies and grants below. The only
-- direct writes are team_activity (inning results, season ended) and nudges.

-- ─── 1. Players can no longer set their own team ──────────────────────────────
-- Column-level grants: everything a player edits from the app, nothing else.
-- group_team_id is set only by the team functions; last_notified_date only by
-- the reminder job (service role).
revoke update on public.profiles from anon, authenticated;
grant update (
  display_name, avatar_url, sport, updated_at,
  default_mind_task, default_spirit_task, default_body_task, default_offense_goals,
  username, team_name, mascot, team_palette, timezone,
  pinch_hitter_tokens, daily_bible_verse, is_discoverable, public_email, auto_carry_tasks
) on public.profiles to authenticated;

-- Profiles are created by the signup trigger, never by the app; a direct insert
-- could otherwise choose its own group_team_id.
revoke insert on public.profiles from anon, authenticated;

-- ─── 2. Team membership changes only through the team functions ──────────────
drop policy if exists team_members_insert on public.team_members;
drop policy if exists team_members_update on public.team_members;
drop policy if exists team_members_delete on public.team_members;

-- ─── 3. Teams: visible only to their own members ─────────────────────────────
-- Search, invite links and "my team" all use SECURITY DEFINER functions, so
-- nothing needs to read other teams (or their invite codes) directly.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
  for select to authenticated
  using (id = (select group_team_id from public.profiles where id = (select auth.uid())));

drop policy if exists teams_insert on public.teams;
drop policy if exists teams_update on public.teams;
drop policy if exists teams_delete on public.teams;

-- ─── 4. Achievements are awarded only by check_team_achievements ─────────────
drop policy if exists team_achievements_insert on public.team_achievements;

-- ─── 5. Feed posts: your own, about your own results, on your own team ───────
-- Membership is checked against team_members (not the profile column).
-- Achievement and member-joined posts come only from the team functions.
drop policy if exists team_activity_insert on public.team_activity;
create policy team_activity_insert on public.team_activity
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and type in ('inning_won', 'inning_closed', 'season_ended')
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = team_activity.team_id
        and tm.user_id = (select auth.uid())
        and tm.status  = 'active'
    )
  );

-- ─── 6. Team names have a length limit on the server too ─────────────────────
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
  v_name     text := trim(coalesce(p_name, ''));
begin
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    return json_build_object('error', 'invalid_name');
  end if;

  select group_team_id into v_existing from public.profiles where id = auth.uid();
  if v_existing is not null then
    return json_build_object('error', 'already_on_team');
  end if;

  v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.teams (name, invite_code, created_by, is_public)
  values (v_name, v_code, auth.uid(), coalesce(p_is_public, false))
  returning id into v_team_id;

  insert into public.team_members (team_id, user_id, role, status)
  values (v_team_id, auth.uid(), 'admin', 'active');

  update public.profiles set group_team_id = v_team_id where id = auth.uid();

  insert into public.team_activity (team_id, user_id, type, metadata)
  values (v_team_id, auth.uid(), 'member_joined',
    json_build_object('display_name',
      (select display_name from public.profiles where id = auth.uid())));

  return json_build_object('success', true, 'team_id', v_team_id, 'invite_code', v_code);
end;
$$;

-- ─── 7. A team always keeps an admin ─────────────────────────────────────────
-- When the last admin leaves (or is removed), the longest-standing member takes
-- over, so join requests can still be approved.
create or replace function public.leave_team(p_user_id uuid default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target  uuid := coalesce(p_user_id, auth.uid());
  v_team_id uuid;
begin
  select team_id into v_team_id from public.team_members where user_id = v_target;

  -- Removing someone else requires being an active admin of their team.
  if v_target <> auth.uid() then
    if not exists (
      select 1 from public.team_members
      where team_id = v_team_id and user_id = auth.uid() and role = 'admin' and status = 'active'
    ) then return json_build_object('error', 'not_admin'); end if;
  end if;

  delete from public.team_members where user_id = v_target;
  update public.profiles set group_team_id = null where id = v_target;

  if v_team_id is not null and not exists (
    select 1 from public.team_members
    where team_id = v_team_id and role = 'admin' and status = 'active'
  ) then
    update public.team_members set role = 'admin'
    where user_id = (
      select user_id from public.team_members
      where team_id = v_team_id and status = 'active'
      order by joined_at, user_id
      limit 1
    );
  end if;

  return json_build_object('success', true);
end;
$$;

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

  -- Don't demote the only admin.
  if p_role = 'member' and (
    select count(*) from public.team_members
    where team_id = v_team_id and role = 'admin' and status = 'active' and user_id <> p_user_id
  ) = 0 then
    return json_build_object('error', 'last_admin');
  end if;

  update public.team_members
  set role = p_role
  where team_id = v_team_id and user_id = p_user_id and status = 'active';

  return json_build_object('success', true);
end;
$$;

-- ─── 8. Remove an unused function ────────────────────────────────────────────
-- get_activity_feed listed recent wins for every discoverable player app-wide.
-- Nothing calls it since the community feed was removed.
drop function if exists public.get_activity_feed(integer);

-- Restate exposure for the replaced functions.
revoke all on function public.create_team(text, boolean)     from public, anon;
revoke all on function public.leave_team(uuid)               from public, anon;
revoke all on function public.set_member_role(uuid, text)    from public, anon;
grant execute on function public.create_team(text, boolean)  to authenticated;
grant execute on function public.leave_team(uuid)            to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;
