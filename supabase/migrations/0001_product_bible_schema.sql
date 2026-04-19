-- ============================================================
-- Migration 0001 — Product Bible schema
-- ============================================================
-- Supersedes the beta Kiaros schema.
-- DESTRUCTIVE: drops the four beta tables and all data in them.
-- Run only after confirming no production data exists.
--
-- Target: Supabase project `Kairos` (fslowrhswawatdfludqp, us-west-2).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Drop old beta tables (clean cut — we agreed we are early
-- enough to discard the beta shape).
-- ------------------------------------------------------------
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS blueprints CASCADE;
DROP TABLE IF EXISTS onboarding_data CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------
-- Extensions
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Helper: current Clerk user id from the JWT.
-- Clerk is configured as a Supabase third-party auth provider;
-- the browser/server Supabase clients pass the Clerk session
-- token as the Supabase access token, and `auth.jwt()->>'sub'`
-- returns the Clerk user id.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_current_clerk_user_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')
$$;

-- ============================================================
-- user_profiles
-- ============================================================
CREATE TABLE user_profiles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id           TEXT UNIQUE NOT NULL,
  email                   TEXT NOT NULL,
  display_name            TEXT,

  -- Birth data
  birth_date              DATE,
  birth_time              TIME,                    -- null = unknown (use noon in calc)
  birth_time_unknown      BOOLEAN DEFAULT FALSE,
  birth_city              TEXT,
  birth_lat               NUMERIC(9, 6),
  birth_lng               NUMERIC(9, 6),
  birth_tz                TEXT,                    -- IANA timezone string

  -- Computed natal chart (stored once, not recomputed per request)
  -- Shape: see types/ephemeris.ts → NatalChart
  natal_chart             JSONB,

  -- Year config
  plan_year               SMALLINT DEFAULT EXTRACT(YEAR FROM now())::SMALLINT,
  year_vision             TEXT,
  word_of_year            TEXT,
  what_to_release         TEXT,

  -- Menstrual cycle (null if user skipped)
  cycle_enabled           BOOLEAN DEFAULT FALSE,
  avg_cycle_length        SMALLINT CHECK (avg_cycle_length BETWEEN 21 AND 35),
  avg_period_length       SMALLINT CHECK (avg_period_length BETWEEN 2 AND 8),
  last_period_start       DATE,

  onboarding_completed_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_profiles_clerk_user_id ON user_profiles(clerk_user_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile_select" ON user_profiles FOR SELECT
  USING (clerk_user_id = app_current_clerk_user_id());

CREATE POLICY "own_profile_update" ON user_profiles FOR UPDATE
  USING (clerk_user_id = app_current_clerk_user_id());

-- Insert is handled by the Clerk webhook using the service-role
-- client, which bypasses RLS. No INSERT policy for regular users.

-- ============================================================
-- goal_categories
-- ============================================================
CREATE TABLE goal_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  success     TEXT,
  icon_key    TEXT,
  color_key   TEXT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goal_categories_user_id ON goal_categories(user_id);
CREATE INDEX idx_goal_categories_user_sort ON goal_categories(user_id, sort_order);

ALTER TABLE goal_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_categories" ON goal_categories FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- ============================================================
-- tracker_metrics
-- ============================================================
CREATE TABLE tracker_metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES goal_categories(id) ON DELETE SET NULL,
  label       TEXT NOT NULL,
  key         TEXT NOT NULL,
  data_type   TEXT NOT NULL CHECK (data_type IN ('number','boolean','select','text')),
  config      JSONB,
  sort_order  SMALLINT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX idx_tracker_metrics_user_id ON tracker_metrics(user_id);
CREATE INDEX idx_tracker_metrics_category ON tracker_metrics(category_id);

ALTER TABLE tracker_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_metrics" ON tracker_metrics FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- ============================================================
-- daily_logs
-- ============================================================
CREATE TABLE daily_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL,
  values        JSONB NOT NULL DEFAULT '{}'::JSONB,
  energy_level  SMALLINT CHECK (energy_level BETWEEN 1 AND 5),
  mood_tag      TEXT,
  notes         TEXT,
  lunar_phase   TEXT,
  lunar_sign    TEXT,
  cycle_phase   TEXT CHECK (cycle_phase IN ('menstrual','follicular','ovulatory','luteal') OR cycle_phase IS NULL),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, log_date)
);

CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date DESC);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_logs" ON daily_logs FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- ============================================================
-- blueprints
-- ============================================================
CREATE TABLE blueprints (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_year             SMALLINT NOT NULL,
  version               SMALLINT NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'generating'
                          CHECK (status IN ('generating','ready','error')),
  error_message         TEXT,
  year_theme            TEXT,
  year_summary          TEXT,
  astrological_context  TEXT,
  quarters              JSONB,
  months                JSONB,
  weeks                 JSONB,
  push_periods          JSONB,
  rest_periods          JSONB,
  generation_prompt     TEXT,
  model_used            TEXT,
  generated_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, plan_year, version)
);

CREATE INDEX idx_blueprints_user_year ON blueprints(user_id, plan_year, version DESC);
CREATE INDEX idx_blueprints_status ON blueprints(status) WHERE status != 'ready';

ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_blueprints" ON blueprints FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- ============================================================
-- journal_entries
-- ============================================================
CREATE TABLE journal_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  entry_date       DATE NOT NULL,
  title            TEXT,
  body             TEXT NOT NULL,
  mood_tag         TEXT,
  lunar_phase      TEXT,
  lunar_sign       TEXT,
  cycle_phase      TEXT,
  transit_context  JSONB,
  goal_tags        UUID[] DEFAULT '{}',
  is_ritual        BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_journal_user_date ON journal_entries(user_id, entry_date DESC);
CREATE INDEX idx_journal_user_ritual ON journal_entries(user_id, is_ritual) WHERE is_ritual = TRUE;

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_journal" ON journal_entries FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- ============================================================
-- cycle_entries
-- ============================================================
CREATE TABLE cycle_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE,
  cycle_length  SMALLINT,
  notes         JSONB,
  symptoms      JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cycle_user_start ON cycle_entries(user_id, period_start DESC);

ALTER TABLE cycle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_cycle" ON cycle_entries FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- ============================================================
-- quarterly_reviews
-- ============================================================
CREATE TABLE quarterly_reviews (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  plan_year                 SMALLINT NOT NULL,
  quarter                   SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  completed_at              TIMESTAMPTZ,
  wins                      JSONB,
  challenges                JSONB,
  pivots                    TEXT,
  next_quarter_intentions   TEXT,
  stats_snapshot            JSONB,
  ai_summary                TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, plan_year, quarter)
);

CREATE INDEX idx_reviews_user_year ON quarterly_reviews(user_id, plan_year, quarter);

ALTER TABLE quarterly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_reviews" ON quarterly_reviews FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- ============================================================
-- ephemeris_cache
-- ============================================================
-- Per-user because house placements depend on birth lat/lng.
-- Planetary longitudes alone could be shared, but keeping it
-- simple and per-user for v1.
CREATE TABLE ephemeris_cache (
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  year          SMALLINT NOT NULL,
  data          JSONB NOT NULL,
  computed_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, year)
);

ALTER TABLE ephemeris_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_ephemeris" ON ephemeris_cache FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- ============================================================
-- updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_daily_logs_updated_at
  BEFORE UPDATE ON daily_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_journal_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
