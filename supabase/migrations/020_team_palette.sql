-- Add team_palette column to profiles
-- Stores a palette string like "blue/slate" (accentId/navyId)
alter table profiles
  add column if not exists team_palette text default null;
