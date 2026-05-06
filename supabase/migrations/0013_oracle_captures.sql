BEGIN;

CREATE TABLE oracle_captures (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  captured_text       TEXT NOT NULL CHECK (char_length(captured_text) BETWEEN 1 AND 4000),
  source_message_id   TEXT,
  source_role         TEXT NOT NULL DEFAULT 'assistant'
                        CHECK (source_role IN ('user', 'assistant', 'system')),
  source_excerpt      TEXT,
  include_in_insights BOOLEAN NOT NULL DEFAULT false,
  include_in_planner  BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_oracle_captures_user_created
  ON oracle_captures(user_id, created_at DESC);

CREATE INDEX idx_oracle_captures_insights
  ON oracle_captures(user_id, created_at DESC)
  WHERE include_in_insights = true;

CREATE INDEX idx_oracle_captures_planner
  ON oracle_captures(user_id, created_at DESC)
  WHERE include_in_planner = true;

ALTER TABLE oracle_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_oracle_captures" ON oracle_captures FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ))
  WITH CHECK (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TRIGGER trg_oracle_captures_updated_at
  BEFORE UPDATE ON oracle_captures
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
