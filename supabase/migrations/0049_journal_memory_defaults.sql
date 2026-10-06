BEGIN;

-- Stopped writing oracle_memory on insert; this trigger overwrote include_in_stelloquy from oracle_memory.
DROP TRIGGER IF EXISTS trg_journal_stelloquy_consent_compat ON public.journal_entries;
DROP FUNCTION IF EXISTS public.sync_journal_stelloquy_consent_compat();

ALTER TABLE public.user_settings
  ADD COLUMN journal_memory_mode TEXT
    CHECK (journal_memory_mode IS NULL OR journal_memory_mode IN ('use_entries', 'choose_each')),
  ADD COLUMN default_include_in_insights BOOLEAN,
  ADD COLUMN default_include_in_stelloquy BOOLEAN,
  ADD COLUMN memory_mode_prompted_at TIMESTAMPTZ,
  ADD COLUMN past_entries_included_at TIMESTAMPTZ;

ALTER TABLE public.journal_entry_consent_audit
  ALTER COLUMN journal_entry_id DROP NOT NULL;

ALTER TABLE public.journal_entry_consent_audit
  DROP CONSTRAINT IF EXISTS journal_entry_consent_audit_event_type_check;

ALTER TABLE public.journal_entry_consent_audit
  ADD CONSTRAINT journal_entry_consent_audit_event_type_check
    CHECK (
      event_type IN (
        'created',
        'changed',
        'backfilled',
        'account_default_applied',
        'bulk_past_entries_include'
      )
    );

CREATE OR REPLACE FUNCTION public.audit_journal_consent_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_change_source TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND
     NEW.include_in_insights IS NOT DISTINCT FROM OLD.include_in_insights AND
     NEW.include_in_stelloquy IS NOT DISTINCT FROM OLD.include_in_stelloquy AND
     NEW.memory_pinned IS NOT DISTINCT FROM OLD.memory_pinned AND
     NEW.memory_importance IS NOT DISTINCT FROM OLD.memory_importance THEN
    RETURN NEW;
  END IF;

  v_change_source := COALESCE(
    NULLIF(current_setting('kiaros.consent_change_source', true), ''),
    'database_trigger'
  );

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
    v_change_source
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_journal_consent_change() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.bulk_apply_journal_entry_consent(
  p_user_id UUID,
  p_set_insights BOOLEAN,
  p_set_stelloquy BOOLEAN,
  p_skip_insights_entry_ids UUID[],
  p_skip_stelloquy_entry_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  PERFORM set_config('kiaros.consent_change_source', 'bulk_past_entries_include', true);

  UPDATE public.journal_entries je
  SET
    include_in_insights = CASE
      WHEN p_set_insights AND NOT (je.id = ANY (COALESCE(p_skip_insights_entry_ids, ARRAY[]::UUID[])))
        THEN true
      ELSE je.include_in_insights
    END,
    include_in_stelloquy = CASE
      WHEN p_set_stelloquy AND NOT (je.id = ANY (COALESCE(p_skip_stelloquy_entry_ids, ARRAY[]::UUID[])))
        THEN true
      ELSE je.include_in_stelloquy
    END
  WHERE je.user_id = p_user_id
    AND (
      (
        p_set_insights
        AND NOT (je.id = ANY (COALESCE(p_skip_insights_entry_ids, ARRAY[]::UUID[])))
        AND je.include_in_insights IS DISTINCT FROM true
      )
      OR (
        p_set_stelloquy
        AND NOT (je.id = ANY (COALESCE(p_skip_stelloquy_entry_ids, ARRAY[]::UUID[])))
        AND je.include_in_stelloquy IS DISTINCT FROM true
      )
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_apply_journal_entry_consent(UUID, BOOLEAN, BOOLEAN, UUID[], UUID[])
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_apply_journal_entry_consent(UUID, BOOLEAN, BOOLEAN, UUID[], UUID[])
TO service_role;

COMMIT;
