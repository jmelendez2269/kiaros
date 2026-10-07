-- 0050_lock_down_security_definer_functions.sql
--
-- RECONSTRUCTED 2026-10-07 from production evidence. This file was never committed.
-- It was applied directly to production (fslowrhswawatdfludqp) through the Supabase
-- Management API (database/query) on 2026-09-17, about 7:49-7:51 PM ET, and recorded
-- in supabase_migrations.schema_migrations as ('0050','lock_down_security_definer_functions')
-- with no statements. The statements below are copied from pg_stat_statements.
--
-- Original rationale (from the applied SQL's own header): the project's default
-- privileges granted EXECUTE on new public functions to anon and authenticated as
-- named-role ACL entries. `REVOKE ALL ... FROM PUBLIC` (used by 0039 and 0047) does
-- not remove those entries, so SECURITY DEFINER functions that trust a caller-supplied
-- p_user_id (recall_journal_memories, claim_reflection, finish_reflection, ...) were
-- callable by anon/authenticated over /rest/v1/rpc for ANY user id.
--
-- Revoke-only and idempotent. It touches no data. Every app call site uses the
-- service-role client, and service_role keeps EXECUTE.
-- rls_auto_enable() (Supabase platform event-trigger function) is intentionally left alone.

BEGIN;

DO $$
DECLARE
  fn TEXT;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.audit_journal_consent_change()',
    'public.claim_reflection(uuid, text, date, date, text, boolean)',
    'public.finish_reflection(uuid, uuid, uuid, bigint, jsonb, jsonb, jsonb, text)',
    'public.increment_ai_usage(uuid, date, text, text, integer, bigint, bigint, bigint, bigint)',
    'public.invalidate_reflections(uuid)',
    'public.invalidate_reflections_for_dates(uuid, date[])',
    'public.recall_journal_memories(uuid, text)',
    'public.recall_journal_memories(uuid, text, uuid[], date, date)',
    'public.reflection_goal_changed()',
    'public.reflection_source_changed()',
    'public.save_reflection_preferences(uuid, text, boolean, boolean)'
  ]
  LOOP
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    END IF;
  END LOOP;
END $$;

-- Root cause: stop this recurring for future functions created by postgres in public.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;
