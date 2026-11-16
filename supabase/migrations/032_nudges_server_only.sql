-- Nudges are created only by the server (November 2026 audit)
--
-- The app used to insert the nudge row from the browser and then call
-- /api/nudge to send the push. The daily cap counted those browser-inserted
-- rows, so calling the endpoint directly sent unlimited pushes, and inserting
-- rows directly created unlimited unread nudges with a note of any length.
--
-- /api/nudge now checks the cap, writes the row and sends the push itself
-- (service role, which bypasses these policies).
--
-- ⚠ APPLY AFTER the matching code is live. Until then the old app still
-- inserts from the browser and "Send Nudge" would fail.

drop policy if exists nudges_insert on public.nudges;

-- Same limit the app and the endpoint enforce. NOT VALID: applies to new rows
-- without failing on any older, longer note.
alter table public.nudges
  drop constraint if exists nudges_custom_message_length;
alter table public.nudges
  add constraint nudges_custom_message_length
  check (custom_message is null or char_length(custom_message) <= 120) not valid;
