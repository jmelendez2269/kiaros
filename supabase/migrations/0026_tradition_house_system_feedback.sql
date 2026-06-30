-- Add tradition and house system preferences to user profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS tradition TEXT DEFAULT 'evolutionary'
    CHECK (tradition IN ('evolutionary','karmic','psychological','traditional','synthesis')),
  ADD COLUMN IF NOT EXISTS house_system TEXT DEFAULT 'porphyry'
    CHECK (house_system IN ('whole_sign','porphyry','placidus'));

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  category TEXT NOT NULL,
  sub_category TEXT,
  message TEXT,
  page_context TEXT,
  generation_ref UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));

CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM user_profiles WHERE clerk_user_id = auth.uid()::text));
