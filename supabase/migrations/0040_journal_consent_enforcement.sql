BEGIN;

-- Rebuild the deterministic pattern layer from entries that explicitly allow
-- Insights use. Direct Stelloquy recall consent is intentionally unrelated.
CREATE OR REPLACE FUNCTION public.refresh_user_pattern_insight(
  p_user_id UUID,
  p_pattern_type TEXT,
  p_pattern_key TEXT,
  p_last_entry_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
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
      COUNT(DISTINCT ja.journal_entry_id)::INTEGER,
      MIN(ja.entry_date),
      MAX(ja.entry_date)
    INTO v_sample_size, v_first_seen, v_last_seen
    FROM public.journal_entry_aspects ja
    JOIN public.journal_entries je ON je.id = ja.journal_entry_id
    WHERE ja.user_id = p_user_id
      AND ja.aspect_key = p_pattern_key
      AND je.include_in_insights = true;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_id', id,
      'entry_date', entry_date,
      'title', title
    ) ORDER BY entry_date DESC), '[]'::JSONB)
    INTO v_evidence
    FROM (
      SELECT DISTINCT je.id, je.entry_date, je.title, je.created_at
      FROM public.journal_entry_aspects ja
      JOIN public.journal_entries je ON je.id = ja.journal_entry_id
      WHERE ja.user_id = p_user_id
        AND ja.aspect_key = p_pattern_key
        AND je.include_in_insights = true
      ORDER BY je.entry_date DESC, je.created_at DESC
      LIMIT 3
    ) recent;
  ELSIF p_pattern_type = 'lunar_phase' THEN
    SELECT
      COUNT(*)::INTEGER,
      MIN(sky.entry_date),
      MAX(sky.entry_date)
    INTO v_sample_size, v_first_seen, v_last_seen
    FROM public.journal_entry_sky sky
    JOIN public.journal_entries je ON je.id = sky.journal_entry_id
    WHERE sky.user_id = p_user_id
      AND sky.moon_phase = p_pattern_key
      AND je.include_in_insights = true;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_id', id,
      'entry_date', entry_date,
      'title', title
    ) ORDER BY entry_date DESC), '[]'::JSONB)
    INTO v_evidence
    FROM (
      SELECT je.id, je.entry_date, je.title, je.created_at
      FROM public.journal_entry_sky sky
      JOIN public.journal_entries je ON je.id = sky.journal_entry_id
      WHERE sky.user_id = p_user_id
        AND sky.moon_phase = p_pattern_key
        AND je.include_in_insights = true
      ORDER BY je.entry_date DESC, je.created_at DESC
      LIMIT 3
    ) recent;
  ELSIF p_pattern_type = 'lunar_sign' THEN
    SELECT
      COUNT(*)::INTEGER,
      MIN(sky.entry_date),
      MAX(sky.entry_date)
    INTO v_sample_size, v_first_seen, v_last_seen
    FROM public.journal_entry_sky sky
    JOIN public.journal_entries je ON je.id = sky.journal_entry_id
    WHERE sky.user_id = p_user_id
      AND sky.moon_sign = p_pattern_key
      AND je.include_in_insights = true;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_id', id,
      'entry_date', entry_date,
      'title', title
    ) ORDER BY entry_date DESC), '[]'::JSONB)
    INTO v_evidence
    FROM (
      SELECT je.id, je.entry_date, je.title, je.created_at
      FROM public.journal_entry_sky sky
      JOIN public.journal_entries je ON je.id = sky.journal_entry_id
      WHERE sky.user_id = p_user_id
        AND sky.moon_sign = p_pattern_key
        AND je.include_in_insights = true
      ORDER BY je.entry_date DESC, je.created_at DESC
      LIMIT 3
    ) recent;
  ELSIF p_pattern_type = 'retrograde' THEN
    SELECT
      COUNT(*)::INTEGER,
      MIN(sky.entry_date),
      MAX(sky.entry_date)
    INTO v_sample_size, v_first_seen, v_last_seen
    FROM public.journal_entry_sky sky
    JOIN public.journal_entries je ON je.id = sky.journal_entry_id
    WHERE sky.user_id = p_user_id
      AND p_pattern_key = ANY(sky.retrogrades)
      AND je.include_in_insights = true;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entry_id', id,
      'entry_date', entry_date,
      'title', title
    ) ORDER BY entry_date DESC), '[]'::JSONB)
    INTO v_evidence
    FROM (
      SELECT je.id, je.entry_date, je.title, je.created_at
      FROM public.journal_entry_sky sky
      JOIN public.journal_entries je ON je.id = sky.journal_entry_id
      WHERE sky.user_id = p_user_id
        AND p_pattern_key = ANY(sky.retrogrades)
        AND je.include_in_insights = true
      ORDER BY je.entry_date DESC, je.created_at DESC
      LIMIT 3
    ) recent;
  ELSE
    RAISE EXCEPTION 'Unsupported pattern type: %', p_pattern_type;
  END IF;

  IF v_sample_size = 0 THEN
    DELETE FROM public.user_pattern_insights
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

  INSERT INTO public.user_pattern_insights AS existing (
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
    last_entry_id = COALESCE(EXCLUDED.last_entry_id, existing.last_entry_id),
    summary = EXCLUDED.summary,
    evidence = EXCLUDED.evidence,
    ai_summary = NULL,
    ai_summary_voice_label = NULL,
    ai_synthesizing_at = NULL,
    updated_at = now();
END;
$$;

COMMIT;
