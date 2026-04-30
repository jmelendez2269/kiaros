BEGIN;

-- One compact sky snapshot per journal entry. This is the entry-level
-- metadata layer the graph and pattern queries can build on.
CREATE TABLE journal_entry_sky (
  journal_entry_id UUID PRIMARY KEY REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  entry_date       DATE NOT NULL,
  sun_sign         TEXT,
  sun_degree       NUMERIC(6, 3),
  moon_phase       TEXT,
  moon_sign        TEXT,
  moon_degree      NUMERIC(6, 3),
  moon_illumination NUMERIC(5, 2),
  moon_phase_event TEXT,
  retrogrades      TEXT[] NOT NULL DEFAULT '{}',
  transit_count    INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entry_sky_user_date
  ON journal_entry_sky(user_id, entry_date DESC);

CREATE INDEX idx_journal_entry_sky_moon_phase
  ON journal_entry_sky(user_id, moon_phase, entry_date DESC)
  WHERE moon_phase IS NOT NULL;

CREATE INDEX idx_journal_entry_sky_moon_sign
  ON journal_entry_sky(user_id, moon_sign, entry_date DESC)
  WHERE moon_sign IS NOT NULL;

CREATE INDEX idx_journal_entry_sky_retrogrades
  ON journal_entry_sky USING GIN(retrogrades);

ALTER TABLE journal_entry_sky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_journal_entry_sky" ON journal_entry_sky FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ))
  WITH CHECK (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- One row per transit/natal aspect active when the journal entry was written.
CREATE TABLE journal_entry_aspects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id   UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  entry_date         DATE NOT NULL,
  transiting_planet  TEXT NOT NULL,
  natal_planet       TEXT NOT NULL,
  aspect             TEXT NOT NULL,
  aspect_key         TEXT NOT NULL,
  orb                NUMERIC(6, 3) NOT NULL,
  applying           BOOLEAN NOT NULL,
  transit_longitude  NUMERIC(8, 4),
  natal_longitude    NUMERIC(8, 4),
  lunar_phase        TEXT,
  lunar_sign         TEXT,
  retrogrades        TEXT[] NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (journal_entry_id, aspect_key)
);

CREATE INDEX idx_journal_entry_aspects_user_date
  ON journal_entry_aspects(user_id, entry_date DESC);

CREATE INDEX idx_journal_entry_aspects_key
  ON journal_entry_aspects(user_id, aspect_key, entry_date DESC);

CREATE INDEX idx_journal_entry_aspects_lunar
  ON journal_entry_aspects(user_id, lunar_phase, lunar_sign, entry_date DESC);

ALTER TABLE journal_entry_aspects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_journal_entry_aspects" ON journal_entry_aspects FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ))
  WITH CHECK (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

-- User-level pattern summaries. These are intentionally compact so Oracle
-- can ground on patterns without pulling every old journal entry into prompt.
CREATE TABLE user_pattern_insights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pattern_type   TEXT NOT NULL
                   CHECK (pattern_type IN ('aspect', 'lunar_phase', 'lunar_sign', 'retrograde')),
  pattern_key    TEXT NOT NULL,
  sample_size    INTEGER NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  confidence     NUMERIC(4, 2) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  first_seen     DATE,
  last_seen      DATE,
  last_entry_id  UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  summary        TEXT NOT NULL,
  evidence       JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, pattern_type, pattern_key)
);

CREATE INDEX idx_user_pattern_insights_user_updated
  ON user_pattern_insights(user_id, updated_at DESC);

CREATE INDEX idx_user_pattern_insights_lookup
  ON user_pattern_insights(user_id, pattern_type, pattern_key);

ALTER TABLE user_pattern_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_user_pattern_insights" ON user_pattern_insights FOR ALL
  USING (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ))
  WITH CHECK (user_id = (
    SELECT id FROM user_profiles
    WHERE clerk_user_id = app_current_clerk_user_id()
  ));

CREATE TRIGGER trg_journal_entry_sky_updated_at
  BEFORE UPDATE ON journal_entry_sky
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_pattern_insights_updated_at
  BEFORE UPDATE ON user_pattern_insights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION refresh_user_pattern_insight(
  p_user_id UUID,
  p_pattern_type TEXT,
  p_pattern_key TEXT,
  p_last_entry_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_sample_size INTEGER := 0;
  v_first_seen DATE;
  v_last_seen DATE;
  v_evidence JSONB := '[]'::JSONB;
  v_summary TEXT;
  v_label TEXT;
BEGIN
  IF p_pattern_type = 'aspect' THEN
    SELECT
      COUNT(DISTINCT journal_entry_id)::INTEGER,
      MIN(entry_date),
      MAX(entry_date)
    INTO v_sample_size, v_first_seen, v_last_seen
    FROM journal_entry_aspects
    WHERE user_id = p_user_id
      AND aspect_key = p_pattern_key;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_id', id,
      'entry_date', entry_date,
      'title', title
    ) ORDER BY entry_date DESC), '[]'::JSONB)
    INTO v_evidence
    FROM (
      SELECT DISTINCT je.id, je.entry_date, je.title, je.created_at
      FROM journal_entry_aspects ja
      JOIN journal_entries je ON je.id = ja.journal_entry_id
      WHERE ja.user_id = p_user_id
        AND ja.aspect_key = p_pattern_key
      ORDER BY je.entry_date DESC, je.created_at DESC
      LIMIT 3
    ) recent;
  ELSIF p_pattern_type = 'lunar_phase' THEN
    SELECT
      COUNT(*)::INTEGER,
      MIN(entry_date),
      MAX(entry_date)
    INTO v_sample_size, v_first_seen, v_last_seen
    FROM journal_entry_sky
    WHERE user_id = p_user_id
      AND moon_phase = p_pattern_key;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_id', id,
      'entry_date', entry_date,
      'title', title
    ) ORDER BY entry_date DESC), '[]'::JSONB)
    INTO v_evidence
    FROM (
      SELECT je.id, je.entry_date, je.title, je.created_at
      FROM journal_entry_sky sky
      JOIN journal_entries je ON je.id = sky.journal_entry_id
      WHERE sky.user_id = p_user_id
        AND sky.moon_phase = p_pattern_key
      ORDER BY je.entry_date DESC, je.created_at DESC
      LIMIT 3
    ) recent;
  ELSIF p_pattern_type = 'lunar_sign' THEN
    SELECT
      COUNT(*)::INTEGER,
      MIN(entry_date),
      MAX(entry_date)
    INTO v_sample_size, v_first_seen, v_last_seen
    FROM journal_entry_sky
    WHERE user_id = p_user_id
      AND moon_sign = p_pattern_key;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_id', id,
      'entry_date', entry_date,
      'title', title
    ) ORDER BY entry_date DESC), '[]'::JSONB)
    INTO v_evidence
    FROM (
      SELECT je.id, je.entry_date, je.title, je.created_at
      FROM journal_entry_sky sky
      JOIN journal_entries je ON je.id = sky.journal_entry_id
      WHERE sky.user_id = p_user_id
        AND sky.moon_sign = p_pattern_key
      ORDER BY je.entry_date DESC, je.created_at DESC
      LIMIT 3
    ) recent;
  ELSIF p_pattern_type = 'retrograde' THEN
    SELECT
      COUNT(*)::INTEGER,
      MIN(entry_date),
      MAX(entry_date)
    INTO v_sample_size, v_first_seen, v_last_seen
    FROM journal_entry_sky
    WHERE user_id = p_user_id
      AND p_pattern_key = ANY(retrogrades);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_id', id,
      'entry_date', entry_date,
      'title', title
    ) ORDER BY entry_date DESC), '[]'::JSONB)
    INTO v_evidence
    FROM (
      SELECT je.id, je.entry_date, je.title, je.created_at
      FROM journal_entry_sky sky
      JOIN journal_entries je ON je.id = sky.journal_entry_id
      WHERE sky.user_id = p_user_id
        AND p_pattern_key = ANY(sky.retrogrades)
      ORDER BY je.entry_date DESC, je.created_at DESC
      LIMIT 3
    ) recent;
  ELSE
    RAISE EXCEPTION 'Unsupported pattern type: %', p_pattern_type;
  END IF;

  IF v_sample_size = 0 THEN
    DELETE FROM user_pattern_insights
    WHERE user_id = p_user_id
      AND pattern_type = p_pattern_type
      AND pattern_key = p_pattern_key;
    RETURN;
  END IF;

  v_label := CASE
    WHEN p_pattern_type = 'aspect' THEN replace(p_pattern_key, ':', ' ')
    WHEN p_pattern_type = 'lunar_phase' THEN p_pattern_key || ' Moon'
    WHEN p_pattern_type = 'lunar_sign' THEN 'Moon in ' || p_pattern_key
    WHEN p_pattern_type = 'retrograde' THEN p_pattern_key || ' retrograde'
    ELSE p_pattern_key
  END;

  v_summary := format(
    '%s has appeared across %s journal %s from %s to %s. Treat this as observed personal evidence, not a fixed rule.',
    v_label,
    v_sample_size,
    CASE WHEN v_sample_size = 1 THEN 'entry' ELSE 'entries' END,
    v_first_seen,
    v_last_seen
  );

  INSERT INTO user_pattern_insights (
    user_id,
    pattern_type,
    pattern_key,
    sample_size,
    confidence,
    first_seen,
    last_seen,
    last_entry_id,
    summary,
    evidence
  )
  VALUES (
    p_user_id,
    p_pattern_type,
    p_pattern_key,
    v_sample_size,
    LEAST(1.00, ROUND((v_sample_size::NUMERIC / 5.0), 2)),
    v_first_seen,
    v_last_seen,
    p_last_entry_id,
    v_summary,
    v_evidence
  )
  ON CONFLICT (user_id, pattern_type, pattern_key)
  DO UPDATE SET
    sample_size = EXCLUDED.sample_size,
    confidence = EXCLUDED.confidence,
    first_seen = EXCLUDED.first_seen,
    last_seen = EXCLUDED.last_seen,
    last_entry_id = COALESCE(EXCLUDED.last_entry_id, user_pattern_insights.last_entry_id),
    summary = EXCLUDED.summary,
    evidence = EXCLUDED.evidence,
    updated_at = now();
END;
$$;

-- Backfill existing journal entries from the per-user ephemeris cache.
WITH entry_days AS (
  SELECT
    je.id,
    je.user_id,
    je.entry_date,
    day.value AS day_data
  FROM journal_entries je
  JOIN ephemeris_cache ec
    ON ec.user_id = je.user_id
   AND ec.year = EXTRACT(YEAR FROM je.entry_date)::SMALLINT
  JOIN LATERAL jsonb_array_elements(ec.data -> 'days') AS day(value)
    ON day.value ->> 'date' = je.entry_date::TEXT
)
UPDATE journal_entries je
SET
  lunar_phase = COALESCE(je.lunar_phase, INITCAP(REPLACE(entry_days.day_data #>> '{moon,lunarPhase}', '-', ' '))),
  lunar_sign = COALESCE(je.lunar_sign, entry_days.day_data #>> '{moon,sign}'),
  transit_context = COALESCE(je.transit_context, '{}'::JSONB) || jsonb_build_object(
    'sky',
    jsonb_strip_nulls(jsonb_build_object(
      'date', entry_days.entry_date,
      'sun', entry_days.day_data -> 'sun',
      'moon', entry_days.day_data -> 'moon',
      'moonPhaseEvent', entry_days.day_data -> 'moonPhaseEvent',
      'transits', COALESCE(entry_days.day_data -> 'transits', '[]'::JSONB),
      'retrogrades', COALESCE(entry_days.day_data -> 'retrogrades', '[]'::JSONB)
    ))
  )
FROM entry_days
WHERE je.id = entry_days.id;

WITH entry_days AS (
  SELECT
    je.id,
    je.user_id,
    je.entry_date,
    day.value AS day_data
  FROM journal_entries je
  JOIN ephemeris_cache ec
    ON ec.user_id = je.user_id
   AND ec.year = EXTRACT(YEAR FROM je.entry_date)::SMALLINT
  JOIN LATERAL jsonb_array_elements(ec.data -> 'days') AS day(value)
    ON day.value ->> 'date' = je.entry_date::TEXT
)
INSERT INTO journal_entry_sky (
  journal_entry_id,
  user_id,
  entry_date,
  sun_sign,
  sun_degree,
  moon_phase,
  moon_sign,
  moon_degree,
  moon_illumination,
  moon_phase_event,
  retrogrades,
  transit_count
)
SELECT
  entry_days.id,
  entry_days.user_id,
  entry_days.entry_date,
  entry_days.day_data #>> '{sun,sign}',
  NULLIF(entry_days.day_data #>> '{sun,degree}', '')::NUMERIC,
  INITCAP(REPLACE(entry_days.day_data #>> '{moon,lunarPhase}', '-', ' ')),
  entry_days.day_data #>> '{moon,sign}',
  NULLIF(entry_days.day_data #>> '{moon,degree}', '')::NUMERIC,
  NULLIF(entry_days.day_data #>> '{moon,illumination}', '')::NUMERIC,
  entry_days.day_data #>> '{moonPhaseEvent,phase}',
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(entry_days.day_data -> 'retrogrades', '[]'::JSONB))),
    ARRAY[]::TEXT[]
  ),
  jsonb_array_length(COALESCE(entry_days.day_data -> 'transits', '[]'::JSONB))
FROM entry_days
ON CONFLICT (journal_entry_id)
DO UPDATE SET
  user_id = EXCLUDED.user_id,
  entry_date = EXCLUDED.entry_date,
  sun_sign = EXCLUDED.sun_sign,
  sun_degree = EXCLUDED.sun_degree,
  moon_phase = EXCLUDED.moon_phase,
  moon_sign = EXCLUDED.moon_sign,
  moon_degree = EXCLUDED.moon_degree,
  moon_illumination = EXCLUDED.moon_illumination,
  moon_phase_event = EXCLUDED.moon_phase_event,
  retrogrades = EXCLUDED.retrogrades,
  transit_count = EXCLUDED.transit_count,
  updated_at = now();

WITH entry_days AS (
  SELECT
    je.id,
    je.user_id,
    je.entry_date,
    day.value AS day_data
  FROM journal_entries je
  JOIN ephemeris_cache ec
    ON ec.user_id = je.user_id
   AND ec.year = EXTRACT(YEAR FROM je.entry_date)::SMALLINT
  JOIN LATERAL jsonb_array_elements(ec.data -> 'days') AS day(value)
    ON day.value ->> 'date' = je.entry_date::TEXT
)
INSERT INTO journal_entry_aspects (
  journal_entry_id,
  user_id,
  entry_date,
  transiting_planet,
  natal_planet,
  aspect,
  aspect_key,
  orb,
  applying,
  transit_longitude,
  natal_longitude,
  lunar_phase,
  lunar_sign,
  retrogrades
)
SELECT
  entry_days.id,
  entry_days.user_id,
  entry_days.entry_date,
  transit.value ->> 'planet',
  transit.value ->> 'natalPlanet',
  transit.value ->> 'aspect',
  (transit.value ->> 'planet') || ':' || (transit.value ->> 'aspect') || ':' || (transit.value ->> 'natalPlanet'),
  NULLIF(transit.value ->> 'orb', '')::NUMERIC,
  COALESCE((transit.value ->> 'applying')::BOOLEAN, false),
  NULLIF(transit.value ->> 'transitLongitude', '')::NUMERIC,
  NULLIF(transit.value ->> 'natalLongitude', '')::NUMERIC,
  INITCAP(REPLACE(entry_days.day_data #>> '{moon,lunarPhase}', '-', ' ')),
  entry_days.day_data #>> '{moon,sign}',
  COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(entry_days.day_data -> 'retrogrades', '[]'::JSONB))),
    ARRAY[]::TEXT[]
  )
FROM entry_days
JOIN LATERAL jsonb_array_elements(COALESCE(entry_days.day_data -> 'transits', '[]'::JSONB)) AS transit(value)
  ON true
WHERE transit.value ? 'planet'
  AND transit.value ? 'natalPlanet'
  AND transit.value ? 'aspect'
  AND transit.value ? 'orb'
ON CONFLICT (journal_entry_id, aspect_key) DO NOTHING;

SELECT refresh_user_pattern_insight(user_id, 'aspect', aspect_key, NULL)
FROM (
  SELECT DISTINCT user_id, aspect_key
  FROM journal_entry_aspects
) patterns;

SELECT refresh_user_pattern_insight(user_id, 'lunar_phase', moon_phase, NULL)
FROM (
  SELECT DISTINCT user_id, moon_phase
  FROM journal_entry_sky
  WHERE moon_phase IS NOT NULL
) patterns;

SELECT refresh_user_pattern_insight(user_id, 'lunar_sign', moon_sign, NULL)
FROM (
  SELECT DISTINCT user_id, moon_sign
  FROM journal_entry_sky
  WHERE moon_sign IS NOT NULL
) patterns;

SELECT refresh_user_pattern_insight(user_id, 'retrograde', retrograde, NULL)
FROM (
  SELECT DISTINCT user_id, unnest(retrogrades) AS retrograde
  FROM journal_entry_sky
  WHERE array_length(retrogrades, 1) > 0
) patterns;

COMMIT;
