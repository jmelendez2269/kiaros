-- ============================================================
-- 0033_plan_items_scheduling.sql
--
-- Extends plan_items (0030) with time-of-day scheduling so the
-- Planner's Day grid can place tasks at specific times, plus a
-- link back to area_goals so goal-derived tasks are traceable
-- and a source tag distinguishing manual/imported/AI-placed/
-- goal-derived items. Additive only — existing rows keep
-- start_minute NULL (untimed, shown in the checklist/tray).
-- ============================================================

ALTER TABLE plan_items
  ADD COLUMN IF NOT EXISTS start_minute SMALLINT,
  ADD COLUMN IF NOT EXISTS duration_minutes SMALLINT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS area_goal_id UUID REFERENCES area_goals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE plan_items
  ADD CONSTRAINT plan_items_start_minute_range
    CHECK (start_minute IS NULL OR (start_minute >= 0 AND start_minute < 1440));

ALTER TABLE plan_items
  ADD CONSTRAINT plan_items_duration_positive
    CHECK (duration_minutes > 0);

ALTER TABLE plan_items
  ADD CONSTRAINT plan_items_source_valid
    CHECK (source IN ('manual', 'import', 'ai-placed', 'goal'));

CREATE INDEX IF NOT EXISTS idx_plan_items_area_goal ON plan_items(area_goal_id) WHERE area_goal_id IS NOT NULL;
