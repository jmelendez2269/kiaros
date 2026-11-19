-- ============================================================
-- 0058_goal_year_choices.sql
--
-- The goal review for the year ahead. From November 1 a member can
-- carry, reshape or release each goal for the next planner year.
-- The choice is kept here, apart from area_goals, so the current
-- year's goals stay exactly as they are until the year turns.
-- Writes go through the service role (API routes); members can read
-- their own rows.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.goal_year_choices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  area_goal_id   UUID NOT NULL REFERENCES public.area_goals(id) ON DELETE CASCADE,
  plan_year      SMALLINT NOT NULL CHECK (plan_year BETWEEN 2000 AND 2100),
  choice         TEXT NOT NULL CHECK (choice IN ('carry', 'reshape', 'release')),
  reshaped_title TEXT CHECK (reshaped_title IS NULL OR char_length(reshaped_title) <= 200),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT goal_year_choices_one_per_goal_year UNIQUE (user_id, area_goal_id, plan_year)
);

CREATE INDEX IF NOT EXISTS idx_goal_year_choices_user_year
  ON public.goal_year_choices (user_id, plan_year);

ALTER TABLE public.goal_year_choices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.goal_year_choices FROM anon, authenticated;
GRANT ALL ON public.goal_year_choices TO service_role;
GRANT SELECT ON public.goal_year_choices TO authenticated;

DROP POLICY IF EXISTS own_read ON public.goal_year_choices;
CREATE POLICY own_read ON public.goal_year_choices FOR SELECT TO authenticated
  USING (user_id IN (
    SELECT id FROM public.user_profiles
    WHERE clerk_user_id = public.app_current_clerk_user_id()
  ));

DROP TRIGGER IF EXISTS trg_goal_year_choices_updated_at ON public.goal_year_choices;
CREATE TRIGGER trg_goal_year_choices_updated_at
  BEFORE UPDATE ON public.goal_year_choices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
