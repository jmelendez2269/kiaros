BEGIN;

-- Saved look backs for sky cycles (retrogrades, eclipse seasons, slow ingresses,
-- seasons, personal slow transits). Cycles are detected in code
-- (lib/sky-cycles); cycle_id is the detector's stable id, e.g.
-- "retrograde:Mercury:2026-10-25" or "personal:Pluto:square:Moon:2025-11-12".
CREATE TABLE public.sky_cycle_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  cycle_id        TEXT NOT NULL CHECK (char_length(cycle_id) BETWEEN 1 AND 200),
  cycle_kind      TEXT NOT NULL CHECK (
    cycle_kind IN ('retrograde', 'eclipse', 'ingress', 'season', 'personal_transit')
  ),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL CHECK (end_date >= start_date),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  quotes_journal  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sky_cycle_reviews_user_cycle_unique UNIQUE (user_id, cycle_id)
);

COMMENT ON TABLE public.sky_cycle_reviews IS
  'Cached on-demand look backs for sky cycles. Same payload shape as period_reviews.';
COMMENT ON COLUMN public.sky_cycle_reviews.payload IS
  'Structured cache: sections, sourceChips, summary, generatedAt, model, regenerations.';
COMMENT ON COLUMN public.sky_cycle_reviews.quotes_journal IS
  'True when payload includes journal-derived content; used for consent withdrawal cleanup.';

CREATE INDEX idx_sky_cycle_reviews_user_end_date
  ON public.sky_cycle_reviews (user_id, end_date DESC);

CREATE INDEX idx_sky_cycle_reviews_user_quotes_journal
  ON public.sky_cycle_reviews (user_id)
  WHERE quotes_journal = true;

CREATE OR REPLACE FUNCTION public.set_sky_cycle_reviews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sky_cycle_reviews_set_updated_at
  BEFORE UPDATE ON public.sky_cycle_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_sky_cycle_reviews_updated_at();

ALTER TABLE public.sky_cycle_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_sky_cycle_reviews" ON public.sky_cycle_reviews
  FOR ALL
  USING (
    user_id = (
      SELECT id FROM public.user_profiles
      WHERE clerk_user_id = public.app_current_clerk_user_id()
    )
  )
  WITH CHECK (
    user_id = (
      SELECT id FROM public.user_profiles
      WHERE clerk_user_id = public.app_current_clerk_user_id()
    )
  );

COMMIT;

-- =============================================================================
-- ROLLBACK (manual)
-- =============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS sky_cycle_reviews_set_updated_at ON public.sky_cycle_reviews;
-- DROP FUNCTION IF EXISTS public.set_sky_cycle_reviews_updated_at();
-- DROP POLICY IF EXISTS "own_sky_cycle_reviews" ON public.sky_cycle_reviews;
-- DROP TABLE IF EXISTS public.sky_cycle_reviews;
-- COMMIT;
