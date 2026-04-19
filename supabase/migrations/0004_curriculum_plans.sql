BEGIN;

CREATE TABLE curriculum_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'archived')),
  intensity TEXT NOT NULL
    CHECK (intensity IN ('light', 'balanced', 'dense')),
  duration_weeks SMALLINT NOT NULL CHECK (duration_weeks BETWEEN 1 AND 52),
  weekly_hours SMALLINT NOT NULL CHECK (weekly_hours BETWEEN 1 AND 40),
  objectives JSONB NOT NULL DEFAULT '[]'::JSONB,
  outcomes JSONB NOT NULL DEFAULT '[]'::JSONB,
  skills JSONB NOT NULL DEFAULT '[]'::JSONB,
  curriculum JSONB NOT NULL,
  summary TEXT,
  constraints TEXT,
  start_date DATE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_curriculum_plans_user_status
  ON curriculum_plans(user_id, status, created_at DESC);

ALTER TABLE curriculum_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_curriculum_plans" ON curriculum_plans FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TABLE curriculum_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_plan_id UUID NOT NULL REFERENCES curriculum_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  curriculum_title TEXT NOT NULL,
  week_number SMALLINT NOT NULL CHECK (week_number BETWEEN 1 AND 52),
  session_order SMALLINT NOT NULL CHECK (session_order BETWEEN 1 AND 20),
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT NOT NULL
    CHECK (session_type IN ('lesson', 'practice', 'review', 'project')),
  estimated_minutes SMALLINT NOT NULL CHECK (estimated_minutes BETWEEN 15 AND 480),
  scheduled_for DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'done', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (curriculum_plan_id, week_number, session_order)
);

CREATE INDEX idx_curriculum_sessions_user_date
  ON curriculum_sessions(user_id, scheduled_for);

CREATE INDEX idx_curriculum_sessions_plan
  ON curriculum_sessions(curriculum_plan_id, scheduled_for);

ALTER TABLE curriculum_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_curriculum_sessions" ON curriculum_sessions FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TRIGGER trg_curriculum_plans_updated_at
  BEFORE UPDATE ON curriculum_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
