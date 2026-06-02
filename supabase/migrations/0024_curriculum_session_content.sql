BEGIN;

-- Holds the on-demand lesson content for each session in a curriculum plan.
-- Keyed by (plan, week, session_order) so it survives the approve flow that
-- rewrites curriculum_sessions, and so unapproved drafts can preview content
-- before scheduling. session_order is 1-based to match curriculum_sessions.
CREATE TABLE curriculum_session_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_plan_id UUID NOT NULL REFERENCES curriculum_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  week_number SMALLINT NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  session_order SMALLINT NOT NULL CHECK (session_order BETWEEN 1 AND 20),
  body TEXT NOT NULL,
  exercises JSONB NOT NULL DEFAULT '[]'::JSONB,
  reflection_prompt TEXT,
  model TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (curriculum_plan_id, week_number, session_order)
);

CREATE INDEX idx_curriculum_session_content_plan
  ON curriculum_session_content(curriculum_plan_id, week_number, session_order);

ALTER TABLE curriculum_session_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_curriculum_session_content" ON curriculum_session_content FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TRIGGER trg_curriculum_session_content_updated_at
  BEFORE UPDATE ON curriculum_session_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
