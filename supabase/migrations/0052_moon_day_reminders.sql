-- Moon-day ritual nudge: per-account reminder toggle and dismissal keys (phase:YYYY-MM-DD).

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS moon_day_reminders_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS moon_day_nudge_dismissals jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_settings.moon_day_reminders_enabled IS
  'When false, hide the Today moon-day ritual nudge.';
COMMENT ON COLUMN user_settings.moon_day_nudge_dismissals IS
  'Map of dismissal keys (new|full:local-date) set to true for the rest of that moon day.';
