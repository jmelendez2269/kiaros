BEGIN;

ALTER TABLE user_profiles
  ADD COLUMN profile_setup_completed_at TIMESTAMPTZ;

-- Existing customers completed profile setup as part of the original
-- full-blueprint onboarding flow.
UPDATE user_profiles
SET profile_setup_completed_at = onboarding_completed_at
WHERE onboarding_completed_at IS NOT NULL
  AND profile_setup_completed_at IS NULL;

CREATE TABLE preview_access (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  started_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at               TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'expired', 'converted')),
  converted_entitlement_id UUID REFERENCES product_entitlements(id) ON DELETE SET NULL,
  converted_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE week_previews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'generating'
                    CHECK (status IN ('generating', 'ready', 'error')),
  content         JSONB,
  error_message   TEXT,
  model_used      TEXT,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  generated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_preview_access_status
  ON preview_access(user_id, status, expires_at DESC);

CREATE INDEX idx_week_previews_status
  ON week_previews(user_id, status);

ALTER TABLE preview_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_preview_access_select" ON preview_access FOR SELECT
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE POLICY "own_week_previews_select" ON week_previews FOR SELECT
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TRIGGER trg_preview_access_updated_at
  BEFORE UPDATE ON preview_access
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_week_previews_updated_at
  BEFORE UPDATE ON week_previews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
