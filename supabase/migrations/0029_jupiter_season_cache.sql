-- Migration 0029: Add Jupiter season read cache columns to user_settings.
-- The Jupiter season read is keyed by "jupiter:{sign}:{year}" and refreshes
-- roughly once a year when Jupiter changes signs.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS jupiter_season_read       text,
  ADD COLUMN IF NOT EXISTS jupiter_season_signature  text,
  ADD COLUMN IF NOT EXISTS jupiter_season_read_at    timestamptz;
