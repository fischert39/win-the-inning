-- ============================================================
-- 023_pinch_hitter.sql — Perfect Week → Pinch Hitter token plumbing
--
-- A Pinch Hitter token is earned by winning all 7 innings of a week (a Perfect
-- Week) and can be spent to add one automatic out to a tough inning. Spending
-- is tracked on innings.pinch_hit_used (already exists). This migration adds the
-- per-game award flag so a token is granted at most once per week.
--
-- Run this file in: Supabase Dashboard → SQL Editor → New Query.
-- ============================================================

alter table public.games
  add column if not exists pinch_token_awarded boolean not null default false;
