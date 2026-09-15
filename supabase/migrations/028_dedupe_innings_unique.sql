-- Remove duplicate days/weeks, then make the database refuse new ones
--
-- Two past seasons contain the same date recorded more than once (in every case
-- a real played day plus an empty auto-created loss), and one week recorded as
-- two games. Nothing prevented it. The backfill and week planner added more ways
-- to create innings in bulk, so two tabs loading at once could race.
--
-- Order matters: clean first, then add the unique indexes (which would fail to
-- build over existing duplicates).

-- Seasons touched by the cleanup, so only their game results get recomputed.
create temp table dup_seasons on commit drop as
  select distinct g.season_id
  from innings i join games g on g.id = i.game_id
  group by g.season_id, i.date having count(*) > 1
  union
  select season_id from games group by season_id, week_start having count(*) > 1;

-- 1. Duplicate innings (same season, same date): keep the row with the most
--    recorded activity — completed outs + completed goals, then goal count,
--    then best result. Their offense goals are removed with them (cascade).
with ranked as (
  select i.id,
    row_number() over (
      partition by g.season_id, i.date
      order by
        (i.mind_completed::int + i.spirit_completed::int + i.body_completed::int
          + (select count(*) from offense_goals og where og.inning_id = i.id and og.completed)) desc,
        (select count(*) from offense_goals og where og.inning_id = i.id) desc,
        case i.result when 'WIN' then 0 when 'TIE' then 1 when 'LOSS' then 2 else 3 end,
        i.closed_at nulls last,
        i.id
    ) as rn
  from innings i join games g on g.id = i.game_id
)
delete from innings where id in (select id from ranked where rn > 1);

-- 2. Duplicate games (same season, same week): move any remaining innings to the
--    game holding the most innings, then delete the now-empty duplicates.
with ranked as (
  select g.id,
    first_value(g.id) over (
      partition by g.season_id, g.week_start
      order by (select count(*) from innings i where i.game_id = g.id) desc, g.id
    ) as keeper,
    count(*) over (partition by g.season_id, g.week_start) as n
  from games g
)
update innings i set game_id = r.keeper
from ranked r
where i.game_id = r.id and r.n > 1 and r.id <> r.keeper;

with ranked as (
  select g.id,
    first_value(g.id) over (
      partition by g.season_id, g.week_start
      order by (select count(*) from innings i where i.game_id = g.id) desc, g.id
    ) as keeper,
    count(*) over (partition by g.season_id, g.week_start) as n
  from games g
)
delete from games g
using ranked r
where g.id = r.id and r.n > 1 and r.id <> r.keeper;

-- 3. Recompute game results for the affected seasons, using the app's rule:
--    a game is decided once one side can't be caught with the innings left.
update games g set result = case
    when x.wins   > x.losses + x.remaining then 'WIN'
    when x.losses > x.wins   + x.remaining then 'LOSS'
    else 'IN_PROGRESS'
  end
from (
  select g2.id,
    count(*) filter (where i.status = 'CLOSED' and i.result = 'WIN')  as wins,
    count(*) filter (where i.status = 'CLOSED' and i.result = 'LOSS') as losses,
    greatest(0, 7 - count(*) filter (where i.status = 'CLOSED'))      as remaining
  from games g2 left join innings i on i.game_id = g2.id
  where g2.season_id in (select season_id from dup_seasons)
  group by g2.id
) x
where g.id = x.id;

-- 4. One inning per day per game, one game per week per season.
create unique index if not exists innings_game_date_key on innings (game_id, date);
create unique index if not exists games_season_week_key on games (season_id, week_start);
