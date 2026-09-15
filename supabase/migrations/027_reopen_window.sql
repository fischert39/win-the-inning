-- Re-opened innings get their own 48-hour window
--
-- Auto-close finalizes any in-progress inning more than two days old. Re-opening
-- an older inning set it back to in-progress, and the realtime reload that the
-- re-open itself triggered immediately closed it again as a loss.
--
-- reopened_at records when the player re-opened it. Auto-close (in the app and
-- in the daily cron) leaves an inning alone for 48 hours after that moment.
alter table innings
  add column if not exists reopened_at timestamptz;
