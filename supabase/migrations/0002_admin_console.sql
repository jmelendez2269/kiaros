-- ============================================================
-- Migration 0002 — Admin Console / Curation Studio
-- ============================================================
-- All tables are admin-only. RLS is enabled with deny-all
-- policies for JWT access. All queries use service-role client.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- Enums
-- ────────────────────────────────────────────────────────────

CREATE TYPE admin_source_type AS ENUM (
  'youtube_video',
  'youtube_channel',
  'podcast',
  'website',
  'book',
  'newsletter',
  'other'
);

CREATE TYPE admin_trust_level AS ENUM (
  'low',
  'medium',
  'high',
  'verified'
);

CREATE TYPE admin_import_type AS ENUM (
  'youtube_transcript',
  'podcast_transcript',
  'manual_paste',
  'url_scrape'
);

CREATE TYPE admin_import_status AS ENUM (
  'pending',
  'fetched',
  'processed',
  'failed'
);

CREATE TYPE admin_card_category AS ENUM (
  'rising_sign',
  'house',
  'planet',
  'transit_timing',
  'planner_translation',
  'general_framework'
);

CREATE TYPE admin_card_status AS ENUM (
  'draft',
  'approved',
  'rejected'
);

CREATE TYPE admin_planner_layer AS ENUM (
  'year',
  'month',
  'week',
  'day'
);

-- ────────────────────────────────────────────────────────────
-- admin_sources
-- ────────────────────────────────────────────────────────────

CREATE TABLE admin_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name     TEXT NOT NULL,
  astrologer_name TEXT,
  source_type     admin_source_type NOT NULL,
  url             TEXT,
  description     TEXT,
  trust_level     admin_trust_level NOT NULL DEFAULT 'medium',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_jwt" ON admin_sources
  FOR ALL TO authenticated USING (FALSE);

CREATE TRIGGER trg_admin_sources_updated_at
  BEFORE UPDATE ON admin_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- admin_imports
-- ────────────────────────────────────────────────────────────

CREATE TABLE admin_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       UUID REFERENCES admin_sources(id) ON DELETE SET NULL,
  import_type     admin_import_type NOT NULL,
  raw_content     TEXT,
  cleaned_content TEXT,
  url             TEXT,
  title           TEXT,
  status          admin_import_status NOT NULL DEFAULT 'pending',
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_imports_source_id ON admin_imports(source_id);
CREATE INDEX idx_admin_imports_status ON admin_imports(status);

ALTER TABLE admin_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_jwt" ON admin_imports
  FOR ALL TO authenticated USING (FALSE);

CREATE TRIGGER trg_admin_imports_updated_at
  BEFORE UPDATE ON admin_imports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- admin_cards
-- ────────────────────────────────────────────────────────────

CREATE TABLE admin_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id        UUID REFERENCES admin_imports(id) ON DELETE SET NULL,
  category         admin_card_category NOT NULL,
  title            TEXT NOT NULL,
  summary          TEXT,
  structured_data  JSONB NOT NULL DEFAULT '{}'::JSONB,
  usable_copy      TEXT,
  source_quotes    TEXT[] NOT NULL DEFAULT '{}',
  source_refs      TEXT[] NOT NULL DEFAULT '{}',
  confidence_score REAL CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  status           admin_card_status NOT NULL DEFAULT 'draft',
  editor_notes     TEXT,
  tags             TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_cards_status ON admin_cards(status);
CREATE INDEX idx_admin_cards_category ON admin_cards(category);
CREATE INDEX idx_admin_cards_import_id ON admin_cards(import_id);

ALTER TABLE admin_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_jwt" ON admin_cards
  FOR ALL TO authenticated USING (FALSE);

CREATE TRIGGER trg_admin_cards_updated_at
  BEFORE UPDATE ON admin_cards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- admin_planner_mappings
-- ────────────────────────────────────────────────────────────

CREATE TABLE admin_planner_mappings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id             UUID NOT NULL REFERENCES admin_cards(id) ON DELETE CASCADE,
  planner_layer       admin_planner_layer NOT NULL,
  use_case            TEXT,
  default_eligible    BOOLEAN NOT NULL DEFAULT TRUE,
  customized_only     BOOLEAN NOT NULL DEFAULT FALSE,
  priority_weight     SMALLINT NOT NULL DEFAULT 50,
  confidence_override REAL CHECK (confidence_override BETWEEN 0.0 AND 1.0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (card_id, planner_layer)
);

CREATE INDEX idx_admin_mappings_card_id ON admin_planner_mappings(card_id);
CREATE INDEX idx_admin_mappings_layer ON admin_planner_mappings(planner_layer);

ALTER TABLE admin_planner_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_jwt" ON admin_planner_mappings
  FOR ALL TO authenticated USING (FALSE);

CREATE TRIGGER trg_admin_mappings_updated_at
  BEFORE UPDATE ON admin_planner_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
