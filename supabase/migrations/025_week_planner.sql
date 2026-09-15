-- Week Planner support
--
-- carried_forward: marks that incomplete goals from the previous day have
-- already been pulled into this inning. Previously carry-forward ran only at
-- inning-creation time, which breaks once the week planner creates innings
-- days in advance — by the time the day arrives, the creation moment is long
-- past. This flag lets carry-forward run when the day actually arrives, and
-- run exactly once.
alter table innings
  add column if not exists carried_forward boolean not null default false;
