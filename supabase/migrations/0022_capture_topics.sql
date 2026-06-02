BEGIN;

CREATE TABLE capture_topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_id  UUID NOT NULL REFERENCES oracle_captures(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('theme','natal_aspect','transit_aspect','hd_element','mood')),
  label       TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  confidence  NUMERIC(3,2) NOT NULL DEFAULT 0.80 CHECK (confidence >= 0 AND confidence <= 1),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_capture_topics_user_kind_label
  ON capture_topics(user_id, kind, label);

CREATE INDEX idx_capture_topics_capture
  ON capture_topics(capture_id);

CREATE INDEX idx_capture_topics_user_created
  ON capture_topics(user_id, created_at DESC);

ALTER TABLE capture_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_capture_topics" ON capture_topics FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ))
  WITH CHECK (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

COMMIT;
