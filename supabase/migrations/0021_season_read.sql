-- ============================================================
-- 0021_season_read.sql
--
-- Adds a cached "season read" to user_settings — the AI synthesis
-- shown at the top of /today that weaves the user's currently-active
-- heavy transit windows (Saturn and the once-in-a-lifetime outer
-- planets), their Human Design Type, and their Gene Keys into a
-- single "what season are you in" paragraph.
--
-- This is expensive to generate (one Haiku call) and changes rarely
-- — only when a rare/once-in-a-lifetime transit window opens or
-- closes. So we cache it keyed by a `season_read_signature` derived
-- from the active heavy windows. When the live signature matches the
-- stored one, /today serves the cached prose; when it drifts, the
-- season API regenerates and overwrites these columns.
--
-- New columns on user_settings:
--   season_read           — the cached 3–5 sentence synthesis.
--   season_read_signature — fingerprint of the heavy windows the
--                           read was written for; staleness check.
--   season_read_at        — when the read was last generated.
-- ============================================================

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS season_read           TEXT,
  ADD COLUMN IF NOT EXISTS season_read_signature TEXT,
  ADD COLUMN IF NOT EXISTS season_read_at         TIMESTAMPTZ;
