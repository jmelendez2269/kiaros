-- =============================================================================
-- PROPOSAL ONLY — DO NOT RUN IN PRODUCTION OR PLACE IN supabase/migrations/
-- =============================================================================
-- Dedicated storage for REVIEW-01 period look-backs (month + quarter AI
-- summaries). Keeps quarterly_reviews reserved for form-based quarterly reviews.
--
-- Status: draft for founder review. Runtime on branch cursor/period-review-01-3c9a
-- continues to use quarterly_reviews cache-only vault rows until this lands.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
CREATE TABLE public.period_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  plan_year       SMALLINT NOT NULL CHECK (plan_year BETWEEN 2000 AND 2100),
  period_kind     TEXT NOT NULL CHECK (period_kind IN ('month', 'quarter')),
  period_index    SMALLINT NOT NULL CHECK (
    (period_kind = 'month' AND period_index BETWEEN 1 AND 12)
    OR (period_kind = 'quarter' AND period_index BETWEEN 1 AND 4)
  ),
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  quotes_journal  BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT period_reviews_user_period_unique
    UNIQUE (user_id, plan_year, period_kind, period_index)
);

COMMENT ON TABLE public.period_reviews IS
  'Cached on-demand month/quarter look-back summaries (REVIEW-01). Not form QR content.';
COMMENT ON COLUMN public.period_reviews.payload IS
  'Structured cache: sections, sourceChips, summary, generatedAt, model, regenerations, etc.';
COMMENT ON COLUMN public.period_reviews.quotes_journal IS
  'True when payload includes journal-derived content; used for consent withdrawal cleanup.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_period_reviews_user_plan_year
  ON public.period_reviews (user_id, plan_year);

CREATE INDEX idx_period_reviews_user_quotes_journal
  ON public.period_reviews (user_id)
  WHERE quotes_journal = true;

-- ---------------------------------------------------------------------------
-- updated_at maintenance (optional; match patterns used elsewhere if adopted)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_period_reviews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER period_reviews_set_updated_at
  BEFORE UPDATE ON public.period_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_period_reviews_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security (same ownership model as quarterly_reviews)
-- ---------------------------------------------------------------------------
ALTER TABLE public.period_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_period_reviews" ON public.period_reviews
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
-- ROLLBACK (run manually if this proposal is applied and must be reverted)
-- =============================================================================
-- BEGIN;
-- DROP TRIGGER IF EXISTS period_reviews_set_updated_at ON public.period_reviews;
-- DROP FUNCTION IF EXISTS public.set_period_reviews_updated_at();
-- DROP POLICY IF EXISTS "own_period_reviews" ON public.period_reviews;
-- DROP TABLE IF EXISTS public.period_reviews;
-- COMMIT;
--
-- After rollback, re-enable the quarterly_reviews vault strategy in application
-- code or restore stats_snapshot.periodReviewCache rows from backup if migrated.
