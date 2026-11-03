BEGIN;

-- Opt-in email heads-ups for sky cycles (retrogrades, eclipses, seasons, slow
-- ingresses, personal slow transits). Separate from marketing_consent: these
-- are product notifications the member switches on from Today or Reviews.
ALTER TABLE public.user_settings
  ADD COLUMN sky_cycle_emails BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sky_cycle_emails_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_settings.sky_cycle_emails IS
  'Opt-in: email a heads-up before a sky cycle starts and a note when its look back is ready.';

-- One row per member per cycle per email kind, so a cycle is never emailed twice.
CREATE TABLE public.sky_cycle_email_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  cycle_id    TEXT NOT NULL CHECK (char_length(cycle_id) BETWEEN 1 AND 200),
  email_kind  TEXT NOT NULL CHECK (email_kind IN ('heads_up', 'look_back')),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sky_cycle_email_log_unique UNIQUE (user_id, cycle_id, email_kind)
);

CREATE INDEX idx_sky_cycle_email_log_user_sent
  ON public.sky_cycle_email_log (user_id, sent_at DESC);

-- Written only by the service role (cron); members may read their own rows.
ALTER TABLE public.sky_cycle_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_sky_cycle_email_log_read" ON public.sky_cycle_email_log
  FOR SELECT
  USING (
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
-- DROP POLICY IF EXISTS "own_sky_cycle_email_log_read" ON public.sky_cycle_email_log;
-- DROP TABLE IF EXISTS public.sky_cycle_email_log;
-- ALTER TABLE public.user_settings DROP COLUMN IF EXISTS sky_cycle_emails_updated_at;
-- ALTER TABLE public.user_settings DROP COLUMN IF EXISTS sky_cycle_emails;
-- COMMIT;
