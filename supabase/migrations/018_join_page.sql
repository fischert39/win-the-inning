-- ============================================================
-- 018 Public join-page lookup + invite code for all members
-- ============================================================

-- Public lookup by invite code (works for anonymous / unauthenticated visitors)
-- Used by the /join/[code] landing page
create or replace function public.get_team_by_code(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return (
    select json_build_object(
      'id',           t.id,
      'name',         t.name,
      'member_count', (select count(*)::int from public.team_members
                       where team_id = t.id and status = 'active'),
      'is_full',      (select count(*)::int from public.team_members
                       where team_id = t.id and status = 'active') >= 10
    )
    from public.teams t
    where upper(t.invite_code) = upper(trim(p_code))
  );
end;
$$;

-- Grant to anon so the /join page works before the user signs in
grant execute on function public.get_team_by_code(text) to anon;
grant execute on function public.get_team_by_code(text) to authenticated;

-- Update get_my_team: return invite_code for ALL active members (not just admins)
-- so any member can share the invite link with friends
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
    'invite_code',   t.invite_code,         -- visible to all active members for sharing
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
