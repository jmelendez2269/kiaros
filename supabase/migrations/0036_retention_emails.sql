-- ============================================================
-- 0036_retention_emails.sql
--
-- Infra for the retention email loop: tracks when a user was
-- last active (drives the "quiet sky" win-back email) and logs
-- which retention emails have already gone out (dedupe across
-- daily cron runs).
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Backfill so already-inactive users (e.g. someone who last visited weeks
-- ago, before this column existed) are correctly read as inactive rather
-- than NULL — otherwise the "quiet sky" win-back email would never reach
-- exactly the users it exists for.
UPDATE user_profiles
  SET last_seen_at = COALESCE(updated_at, created_at)
  WHERE last_seen_at IS NULL;

CREATE TABLE IF NOT EXISTS retention_email_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('week_ahead', 'quiet_sky')),
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retention_email_log_user_type
  ON retention_email_log(user_id, email_type, sent_at DESC);

ALTER TABLE retention_email_log ENABLE ROW LEVEL SECURITY;

-- Written only by the cron route via the service-role client; no
-- end-user-facing policy needed.
