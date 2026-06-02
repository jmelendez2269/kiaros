-- ============================================================
-- 0019_journal_insight_voice.sql
--
-- Adds a per-user `journal_insight_voice` setting and the columns
-- on user_pattern_insights needed to surface AI-synthesised
-- summaries written in that voice.
--
-- Today the `summary` field on user_pattern_insights is a
-- deterministic SQL template ("X has appeared across Y entries
-- from … to …"). Useful as a count, useless as a synthesis. We're
-- keeping that as a fallback and layering an AI-written summary
-- on top via `ai_summary`. The voice the user picks (or writes)
-- is stored on a small user_settings row and bulk-applied to all
-- their patterns when they save it.
--
-- New columns on user_pattern_insights:
--   ai_summary             — Claude's 2–3 sentence observation
--                            built from the actual entry bodies
--                            tagged with this pattern.
--   ai_summary_voice_label — which voice produced ai_summary;
--                            lets us detect staleness if voice
--                            changes.
--   ai_synthesizing_at     — set when a regen job picks the row
--                            up; the page polls on this so cards
--                            can show a "synthesising…" line.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_settings (
  user_id                          UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  journal_insight_voice            TEXT,
  journal_insight_voice_label      TEXT,
  journal_insight_voice_updated_at TIMESTAMPTZ,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_user_settings" ON user_settings FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ))
  WITH CHECK (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_pattern_insights
  ADD COLUMN IF NOT EXISTS ai_summary             TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_voice_label TEXT,
  ADD COLUMN IF NOT EXISTS ai_synthesizing_at     TIMESTAMPTZ;
