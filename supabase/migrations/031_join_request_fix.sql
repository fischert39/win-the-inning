-- Approving a join request only works on a real pending request (November 2026 audit)
--
-- handle_join_request(p_user_id, true) updated team_members only where a
-- pending row existed, but then set profiles.group_team_id and posted a
-- "joined" feed item for p_user_id unconditionally. Any team admin could
-- therefore point any other player's profile at their own team: the victim lost
-- sight of their real team (the team policies trust group_team_id) and could not
-- create or join another until they left.
--
-- Now nothing happens unless a pending request for this team was actually
-- approved. Safe to apply before or after the matching code deploy.

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

    -- No pending request from this player for this team: change nothing.
    if not found then return json_build_object('error', 'no_request'); end if;

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

revoke all on function public.handle_join_request(uuid, boolean) from public, anon;
grant execute on function public.handle_join_request(uuid, boolean) to authenticated;
