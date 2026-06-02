-- ============================================================
-- 0017_blueprints_push_rest_arc.sql
--
-- Add an authored push/rest/edit arc to the blueprint row, separate
-- from the existing push_periods / rest_periods columns. Used by the
-- Month tab "Year's pulse" ribbon on /year?view=month.
--
-- Shape of the JSON payload (see ArcPeriod in components/year/PushRestRibbon):
--   Array<{
--     kind: 'push' | 'rest' | 'edit',
--     startPct: number,    -- 0..100 fraction of the year
--     endPct:   number,    -- 0..100 fraction of the year
--     label:    string,    -- short caption shown above the segment
--   }>
--
-- When NULL, the UI derives an arc from push_periods + rest_periods via
-- lib/year/push-rest-arc.ts. The column exists so future authoring UI
-- (or admin tooling) can override the derivation per blueprint.
-- ============================================================

ALTER TABLE blueprints
  ADD COLUMN IF NOT EXISTS push_rest_arc JSONB;
