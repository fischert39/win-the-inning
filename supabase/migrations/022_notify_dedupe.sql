-- Notification delivery resilience
--
-- The daily reminder used to require a cron run to land inside an exact
-- one-hour window (the user's local 8am). GitHub Actions drops roughly half
-- of its scheduled hourly runs, so that window was missed most days and the
-- notification simply never arrived.
--
-- Recording the last local date we notified each user lets the endpoint send
-- at 8am local *or any later run that day*, exactly once — so a dropped run
-- means a slightly later notification instead of none at all.
alter table profiles
  add column if not exists last_notified_date date;
