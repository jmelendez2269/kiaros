-- ACCESS-02: raw Blueprint rows are server-only.
--
-- Monthly access is a projection of the canonical artifact. Authenticated
-- PostgREST access to the JSON columns would bypass that projection even if
-- every application page hid locked weeks. All application reads and writes
-- therefore go through owner-scoped server code using the service role.
--
-- This migration is intentionally unapplied pending migration-history
-- reconciliation, isolated staging, and two-user RLS verification.

BEGIN;

DROP POLICY IF EXISTS "own_blueprints" ON public.blueprints;

REVOKE ALL PRIVILEGES ON TABLE public.blueprints FROM anon, authenticated;

COMMENT ON TABLE public.blueprints IS
  'Canonical paid Blueprint artifact. Raw rows are service-role only; customer access must use the server-side entitlement projection.';

COMMIT;
