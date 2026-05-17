-- ============================================================
-- 0016_month_briefs_pinned.sql
--
-- Add a pin flag to month_briefs so a user can lock a brief they like.
-- A pinned brief cannot be overwritten by the regenerate action until
-- the user unpins it. Enforced at the API layer (see app/api/month-brief)
-- and surfaced in the UI as a star toggle on MonthBriefPanel.
-- ============================================================

ALTER TABLE month_briefs
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
