-- ============================================================
-- 0018_month_briefs_edited_at.sql
--
-- Adds `edited_at` to month_briefs. When NULL, the brief is the
-- AI-generated version (timestamp lives in generated_at). When set,
-- the user edited the brief in their own words — the panel surfaces
-- it as EDITED <date> instead of GENERATED <date> and Claude no
-- longer overwrites it on regenerate (regen is also blocked by the
-- pin gate; users who want to start fresh from Claude can unpin or
-- delete the row entirely).
-- ============================================================

ALTER TABLE month_briefs
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
