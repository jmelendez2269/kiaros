-- ============================================================
-- 0030_plan_items.sql
--
-- Adds user-authored, date-scoped tasks so the Cosmic Calendar's
-- Week/Month views, Today dashboard, and Tracker can show an
-- actual checkable plan alongside the existing astro content
-- (moon phases, retrogrades, transit badges, curriculum sessions).
-- Mirrors area_goals (0020) for RLS/trigger shape and
-- curriculum_session_progress (0025) for completed_at semantics.
-- ============================================================

CREATE TABLE IF NOT EXISTS plan_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  item_date     DATE NOT NULL,
  title         TEXT NOT NULL,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_items_user_date ON plan_items(user_id, item_date);

ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_plan_items" ON plan_items;
CREATE POLICY "own_plan_items" ON plan_items FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ))
  WITH CHECK (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

DROP TRIGGER IF EXISTS trg_plan_items_updated_at ON plan_items;
CREATE TRIGGER trg_plan_items_updated_at
  BEFORE UPDATE ON plan_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
