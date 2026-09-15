BEGIN;

-- Existing deterministic and AI summaries were built before separate consent
-- existed. Clear them, preserve user-edited monthly text, and rebuild only
-- explicitly approved deterministic evidence. Paid Blueprints are historical
-- artifacts and are intentionally untouched.
DELETE FROM public.user_pattern_insights;
DELETE FROM public.month_briefs WHERE edited_at IS NULL;
UPDATE public.quarterly_reviews SET ai_summary = NULL WHERE ai_summary IS NOT NULL;

SELECT public.refresh_user_pattern_insight(user_id, 'aspect', aspect_key, NULL)
FROM (
  SELECT DISTINCT ja.user_id, ja.aspect_key
  FROM public.journal_entry_aspects ja
  JOIN public.journal_entries je ON je.id = ja.journal_entry_id
  WHERE je.include_in_insights = true
) patterns;

SELECT public.refresh_user_pattern_insight(user_id, 'lunar_phase', moon_phase, NULL)
FROM (
  SELECT DISTINCT sky.user_id, sky.moon_phase
  FROM public.journal_entry_sky sky
  JOIN public.journal_entries je ON je.id = sky.journal_entry_id
  WHERE je.include_in_insights = true
    AND sky.moon_phase IS NOT NULL
) patterns;

SELECT public.refresh_user_pattern_insight(user_id, 'lunar_sign', moon_sign, NULL)
FROM (
  SELECT DISTINCT sky.user_id, sky.moon_sign
  FROM public.journal_entry_sky sky
  JOIN public.journal_entries je ON je.id = sky.journal_entry_id
  WHERE je.include_in_insights = true
    AND sky.moon_sign IS NOT NULL
) patterns;

SELECT public.refresh_user_pattern_insight(user_id, 'retrograde', retrograde, NULL)
FROM (
  SELECT DISTINCT sky.user_id, unnest(sky.retrogrades) AS retrograde
  FROM public.journal_entry_sky sky
  JOIN public.journal_entries je ON je.id = sky.journal_entry_id
  WHERE je.include_in_insights = true
    AND array_length(sky.retrogrades, 1) > 0
) patterns;

COMMIT;
