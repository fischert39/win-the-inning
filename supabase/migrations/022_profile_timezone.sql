-- ============================================================
-- 022_profile_timezone.sql — store each user's IANA timezone
--
-- Used by the daily/weekly push cron so "yesterday", "this week", and the
-- Monday recap are computed in the player's local time instead of UTC.
-- The app fills this in on load from Intl.DateTimeFormat().resolvedOptions().
--
-- Run this file in: Supabase Dashboard → SQL Editor → New Query.
-- ============================================================

alter table public.profiles
  add column if not exists timezone text;
