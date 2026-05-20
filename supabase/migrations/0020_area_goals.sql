-- ============================================================
-- 0020_area_goals.sql
--
-- Adds per-area itemised goals so /areas/[slug] can replace its
-- "Coming next" placeholder with a real goals surface. Today the
-- only goal-shaped data we store is goal_categories.success — a
-- single freeform string per area. That's not enough to track
-- discrete intentions, link them to timing windows, or progress
-- them through a lifecycle.
--
-- Each row is one goal scoped to one area (goal_categories row).
-- linked_week_number is the optional tie-in to a blueprint week
-- so a goal can flow straight into the planner when its window
-- arrives.
-- ============================================================

CREATE TABLE IF NOT EXISTS area_goals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category_id        UUID NOT NULL REFERENCES goal_categories(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','paused','completed','archived')),
  target_label       TEXT,
  linked_week_number SMALLINT,
  sort_order         SMALLINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_area_goals_user_id ON area_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_area_goals_category_id ON area_goals(category_id);
CREATE INDEX IF NOT EXISTS idx_area_goals_category_sort
  ON area_goals(category_id, sort_order);

ALTER TABLE area_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_area_goals" ON area_goals FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ))
  WITH CHECK (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TRIGGER trg_area_goals_updated_at
  BEFORE UPDATE ON area_goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
