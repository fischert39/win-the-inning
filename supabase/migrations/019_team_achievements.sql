-- ============================================================
-- 019 Expanded team achievements
-- ============================================================

-- Expanded check function: evaluates all 10 team achievements
create or replace function public.check_team_achievements(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_count int;
  v_result       boolean;
  v_key          text;
  v_ach_id       uuid;

  -- helper: insert achievement + activity if newly awarded
  -- (can't use inner functions in plpgsql, so we inline it)
begin
  select count(*) into v_member_count
  from public.team_members where team_id = p_team_id and status = 'active';

  if v_member_count < 2 then return; end if;

  -- ── 1. Full Squad Win ─────────────────────────────────────────────────────
  -- All members closed a WIN inning today
  select (count(*) = v_member_count) into v_result
  from public.team_members tm
  where tm.team_id = p_team_id and tm.status = 'active'
    and exists (
      select 1 from public.innings i
      where i.user_id = tm.user_id and i.date = current_date
        and i.status = 'CLOSED' and i.result = 'WIN'
    );

  if v_result then
    v_key := 'full_squad_win_' || current_date::text;
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, v_key,
      json_build_object('date', current_date::text, 'members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'full_squad_win', 'label', '🏆 Full Squad Win',
          'detail', 'Every teammate won their inning today!',
          'date', current_date::text, 'members', v_member_count));
    end if;
  end if;

  -- ── 2. Clean Sweep ───────────────────────────────────────────────────────
  -- All members won their game this week
  select (count(*) = v_member_count) into v_result
  from public.team_members tm
  where tm.team_id = p_team_id and tm.status = 'active'
    and exists (
      select 1 from public.games g
      where g.user_id = tm.user_id
        and g.week_start = date_trunc('week', current_date)::date
        and g.result = 'WIN'
    );

  if v_result then
    v_key := 'clean_sweep_' || date_trunc('week', current_date)::date::text;
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, v_key,
      json_build_object('week', date_trunc('week', current_date)::date::text, 'members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'clean_sweep', 'label', '🧹 Clean Sweep',
          'detail', 'Every teammate won the game this week!',
          'week', date_trunc('week', current_date)::date::text, 'members', v_member_count));
    end if;
  end if;

  -- ── 3. Lockdown ──────────────────────────────────────────────────────────
  -- All members completed all 3 defense tasks today
  select (count(*) = v_member_count) into v_result
  from public.team_members tm
  where tm.team_id = p_team_id and tm.status = 'active'
    and exists (
      select 1 from public.innings i
      where i.user_id = tm.user_id and i.date = current_date
        and i.status = 'CLOSED'
        and i.mind_completed = true
        and i.spirit_completed = true
        and i.body_completed = true
    );

  if v_result then
    v_key := 'lockdown_' || current_date::text;
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, v_key,
      json_build_object('date', current_date::text, 'members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'lockdown', 'label', '🛡️ Lockdown',
          'detail', 'Every teammate completed all 3 defense tasks today!',
          'date', current_date::text));
    end if;
  end if;

  -- ── 4. Squad on Fire ─────────────────────────────────────────────────────
  -- All members currently have a 3+ inning win streak
  select (count(*) = v_member_count) into v_result
  from public.team_members tm
  where tm.team_id = p_team_id and tm.status = 'active'
    and (
      select count(*)::int from public.innings i_streak
      where i_streak.user_id = tm.user_id
        and i_streak.status = 'CLOSED' and i_streak.result = 'WIN'
        and i_streak.date > coalesce(
          (select max(i_loss.date) from public.innings i_loss
           where i_loss.user_id = tm.user_id and i_loss.status = 'CLOSED'
             and i_loss.result != 'WIN'),
          '1900-01-01'::date)
    ) >= 3;

  if v_result then
    v_key := 'squad_on_fire_' || current_date::text;
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, v_key,
      json_build_object('date', current_date::text, 'members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'squad_on_fire', 'label', '🔥 Squad on Fire',
          'detail', 'Every teammate is on a 3+ day win streak!',
          'date', current_date::text));
    end if;
  end if;

  -- ── 5. Three-Peat ────────────────────────────────────────────────────────
  -- Team has earned Full Squad Win at least 3 times
  select (count(*) >= 3) into v_result
  from public.team_achievements
  where team_id = p_team_id and key like 'full_squad_win_%';

  if v_result then
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, 'three_peat',
      json_build_object('members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'three_peat', 'label', '🎯 Three-Peat',
          'detail', 'The whole squad has won together 3 times!'));
    end if;
  end if;

  -- ── 6. Century Club ──────────────────────────────────────────────────────
  -- Team has collectively scored 100+ runs this season
  select (
    coalesce((
      select sum(case og.hit_type
        when 'homer'  then 4
        when 'triple' then 3
        when 'double' then 2
        else 1
      end)
      from public.innings i
      join public.games g on i.game_id = g.id
      join public.seasons s on g.season_id = s.id
      join public.offense_goals og on og.inning_id = i.id
      where og.completed = true
        and s.is_current = true
        and i.user_id in (
          select user_id from public.team_members
          where team_id = p_team_id and status = 'active'
        )
    ), 0) >= 100
  ) into v_result;

  if v_result then
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, 'century_club',
      json_build_object('members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'century_club', 'label', '💯 Century Club',
          'detail', 'Team has collectively scored 100 runs!'));
    end if;
  end if;

  -- ── 7. All-Stars ─────────────────────────────────────────────────────────
  -- Every member has won 10+ innings this season
  select (count(*) = v_member_count) into v_result
  from public.team_members tm
  where tm.team_id = p_team_id and tm.status = 'active'
    and (
      select count(*)
      from public.innings i
      join public.games g on i.game_id = g.id
      join public.seasons s on g.season_id = s.id
      where i.user_id = tm.user_id and s.is_current = true
        and i.status = 'CLOSED' and i.result = 'WIN'
    ) >= 10;

  if v_result then
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, 'all_stars',
      json_build_object('members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'all_stars', 'label', '🌟 All-Stars',
          'detail', 'Every teammate has won 10+ innings this season!'));
    end if;
  end if;

  -- ── 8. Perfect Formation ─────────────────────────────────────────────────
  -- All members win every single inning in the same week (7/7)
  -- Check any past or current week
  select exists (
    select 1
    from (
      select date_trunc('week', i.date::timestamp)::date as wk
      from public.innings i
      join public.team_members tm on tm.user_id = i.user_id
        and tm.team_id = p_team_id and tm.status = 'active'
      where i.status = 'CLOSED'
      group by wk
      having
        count(distinct i.user_id) = v_member_count and
        count(*) filter (where i.result != 'WIN') = 0 and
        count(*) / v_member_count = 7
    ) perfect_weeks
  ) into v_result;

  if v_result then
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, 'perfect_formation',
      json_build_object('members', v_member_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'perfect_formation', 'label', '💎 Perfect Formation',
          'detail', 'Every teammate went 7-for-7 in the same week!'));
    end if;
  end if;
end;
$$;

grant execute on function public.check_team_achievements(uuid) to authenticated;

-- ── Milestone achievements checked on member join ─────────────────────────

-- Called after a new member joins (founding_five + full_roster)
create or replace function public.check_team_membership_achievements(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count  int;
  v_ach_id uuid;
begin
  select count(*) into v_count
  from public.team_members where team_id = p_team_id and status = 'active';

  -- ── 9. Founding Five ─────────────────────────────────────────────────────
  if v_count >= 5 then
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, 'founding_five', json_build_object('members', v_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'founding_five', 'label', '🤝 Founding Five',
          'detail', 'Team has grown to 5 members!'));
    end if;
  end if;

  -- ── 10. Full Roster ──────────────────────────────────────────────────────
  if v_count >= 10 then
    insert into public.team_achievements (team_id, key, metadata)
    values (p_team_id, 'full_roster', json_build_object('members', v_count))
    on conflict (team_id, key) do nothing
    returning id into v_ach_id;

    if v_ach_id is not null then
      insert into public.team_activity (team_id, user_id, type, metadata)
      values (p_team_id, null, 'achievement_unlocked',
        json_build_object('key', 'full_roster', 'label', '👥 Full Roster',
          'detail', 'Team is at full capacity — 10 members!'));
    end if;
  end if;
end;
$$;

grant execute on function public.check_team_membership_achievements(uuid) to authenticated;

-- Update join_team_by_code to trigger membership achievements
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

  -- Check membership milestones
  perform public.check_team_membership_achievements(v_team_id);

  return json_build_object('success', true, 'team_id', v_team_id, 'team_name', v_team_name);
end;
$$;

grant execute on function public.join_team_by_code(text) to authenticated;

-- Update handle_join_request to trigger membership achievements on approval
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

    -- Check membership milestones
    perform public.check_team_membership_achievements(v_team_id);
  else
    delete from public.team_members
    where team_id = v_team_id and user_id = p_user_id and status = 'pending';
  end if;

  return json_build_object('success', true);
end;
$$;

grant execute on function public.handle_join_request(uuid, boolean) to authenticated;
