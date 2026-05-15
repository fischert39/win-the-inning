-- Activity feed: recent WINs from discoverable users with streak counts
create or replace function public.get_activity_feed(limit_count int default 15)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  return coalesce((
    select json_agg(feed order by feed.closed_at desc)
    from (
      select
        p.display_name,
        p.team_name,
        p.mascot,
        i.closed_at,
        (
          select count(*)::int
          from innings s
          where s.user_id = i.user_id
            and s.status = 'CLOSED'
            and s.result = 'WIN'
            and s.date <= i.date
            and s.date > coalesce((
              select max(s2.date)
              from innings s2
              where s2.user_id = i.user_id
                and s2.status = 'CLOSED'
                and s2.result != 'WIN'
                and s2.date < i.date
            ), '1900-01-01'::date)
        ) as streak
      from innings i
      join profiles p on p.id = i.user_id
      where p.is_discoverable = true
        and i.status = 'CLOSED'
        and i.result = 'WIN'
        and i.closed_at is not null
        and i.closed_at >= now() - interval '72 hours'
      order by i.closed_at desc
      limit limit_count
    ) feed
  ), '[]'::json);
end;
$$;
