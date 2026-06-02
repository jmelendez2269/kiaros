BEGIN;

-- Per-session completion state for curriculum plans. Independent of
-- curriculum_session_content (a session can be completed without ever
-- opening its lesson) and independent of curriculum_sessions (which only
-- exists for approved plans and gets wiped+rewritten by the approve flow).
-- session_order is 1-based, matching curriculum_sessions + content tables.
CREATE TABLE curriculum_session_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_plan_id UUID NOT NULL REFERENCES curriculum_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  session_order SMALLINT NOT NULL CHECK (session_order BETWEEN 1 AND 20),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (curriculum_plan_id, week_number, session_order)
);

CREATE INDEX idx_curriculum_session_progress_plan
  ON curriculum_session_progress(curriculum_plan_id, week_number, session_order);

CREATE INDEX idx_curriculum_session_progress_user_completed
  ON curriculum_session_progress(user_id, completed_at)
  WHERE completed_at IS NOT NULL;

ALTER TABLE curriculum_session_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_curriculum_session_progress" ON curriculum_session_progress FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TRIGGER trg_curriculum_session_progress_updated_at
  BEFORE UPDATE ON curriculum_session_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
