BEGIN;

ALTER TABLE public.journal_entries
  ADD COLUMN include_in_insights BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN include_in_stelloquy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN memory_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN memory_importance SMALLINT,
  ADD CONSTRAINT journal_entries_memory_importance_range
    CHECK (memory_importance IS NULL OR memory_importance BETWEEN 1 AND 5);

-- `oracle_memory = true` is evidence only of direct Stelloquy recall consent.
-- It does not grant permission for Insights or broader derived AI use.
UPDATE public.journal_entries
SET include_in_stelloquy = oracle_memory
WHERE include_in_stelloquy IS DISTINCT FROM oracle_memory;

CREATE INDEX idx_journal_entries_insights_consent
  ON public.journal_entries(user_id, entry_date DESC)
  WHERE include_in_insights = true;

CREATE INDEX idx_journal_entries_stelloquy_consent
  ON public.journal_entries(user_id, entry_date DESC)
  WHERE include_in_stelloquy = true;

CREATE INDEX idx_journal_entries_memory_pinned
  ON public.journal_entries(user_id, entry_date DESC)
  WHERE memory_pinned = true;

CREATE OR REPLACE FUNCTION public.sync_journal_stelloquy_consent_compat()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.include_in_stelloquy := NEW.oracle_memory;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_journal_stelloquy_consent_compat() FROM PUBLIC;

CREATE TRIGGER trg_journal_stelloquy_consent_compat
  BEFORE INSERT OR UPDATE OF oracle_memory ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_journal_stelloquy_consent_compat();

CREATE TABLE public.journal_entry_consent_audit (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id                UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id                         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_type                      TEXT NOT NULL
                                    CHECK (event_type IN ('created', 'changed', 'backfilled')),
  previous_include_in_insights    BOOLEAN,
  previous_include_in_stelloquy   BOOLEAN,
  previous_memory_pinned          BOOLEAN,
  previous_memory_importance      SMALLINT
                                    CHECK (
                                      previous_memory_importance IS NULL OR
                                      previous_memory_importance BETWEEN 1 AND 5
                                    ),
  current_include_in_insights     BOOLEAN NOT NULL,
  current_include_in_stelloquy    BOOLEAN NOT NULL,
  current_memory_pinned           BOOLEAN NOT NULL,
  current_memory_importance       SMALLINT
                                    CHECK (
                                      current_memory_importance IS NULL OR
                                      current_memory_importance BETWEEN 1 AND 5
                                    ),
  change_source                   TEXT NOT NULL
                                    CHECK (char_length(change_source) BETWEEN 1 AND 64),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_consent_audit_entry_created
  ON public.journal_entry_consent_audit(journal_entry_id, created_at DESC);

CREATE INDEX idx_journal_consent_audit_user_created
  ON public.journal_entry_consent_audit(user_id, created_at DESC);

INSERT INTO public.journal_entry_consent_audit (
  journal_entry_id,
  user_id,
  event_type,
  current_include_in_insights,
  current_include_in_stelloquy,
  current_memory_pinned,
  current_memory_importance,
  change_source
)
SELECT
  id,
  user_id,
  'backfilled',
  include_in_insights,
  include_in_stelloquy,
  memory_pinned,
  memory_importance,
  'migration_0039'
FROM public.journal_entries;

CREATE OR REPLACE FUNCTION public.audit_journal_consent_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND
     NEW.include_in_insights IS NOT DISTINCT FROM OLD.include_in_insights AND
     NEW.include_in_stelloquy IS NOT DISTINCT FROM OLD.include_in_stelloquy AND
     NEW.memory_pinned IS NOT DISTINCT FROM OLD.memory_pinned AND
     NEW.memory_importance IS NOT DISTINCT FROM OLD.memory_importance THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.journal_entry_consent_audit (
    journal_entry_id,
    user_id,
    event_type,
    previous_include_in_insights,
    previous_include_in_stelloquy,
    previous_memory_pinned,
    previous_memory_importance,
    current_include_in_insights,
    current_include_in_stelloquy,
    current_memory_pinned,
    current_memory_importance,
    change_source
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'changed' END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.include_in_insights ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.include_in_stelloquy ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.memory_pinned ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.memory_importance ELSE NULL END,
    NEW.include_in_insights,
    NEW.include_in_stelloquy,
    NEW.memory_pinned,
    NEW.memory_importance,
    'database_trigger'
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_journal_consent_change() FROM PUBLIC;

CREATE TRIGGER trg_journal_consent_audit
  AFTER INSERT OR UPDATE OF
    include_in_insights,
    include_in_stelloquy,
    memory_pinned,
    memory_importance
  ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_journal_consent_change();

ALTER TABLE public.journal_entry_consent_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_journal_consent_audit_select"
  ON public.journal_entry_consent_audit
  FOR SELECT
  USING (user_id = (
    SELECT id
    FROM public.user_profiles
    WHERE clerk_user_id = public.app_current_clerk_user_id()
  ));

COMMIT;
