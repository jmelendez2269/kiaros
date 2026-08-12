import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(name) {
  return readFileSync(resolve("supabase", "migrations", name), "utf8");
}

const funnel = read("0038_first_party_funnel_events.sql");
const consent = read("0039_journal_consent.sql");
const databaseTypes = readFileSync(resolve("types", "database.ts"), "utf8");

for (const [name, sql] of [
  ["0038", funnel],
  ["0039", consent],
]) {
  assert.match(sql, /^BEGIN;/m, `${name} must begin transactionally`);
  assert.match(sql, /^COMMIT;$/m, `${name} must commit transactionally`);
  assert.doesNotMatch(
    sql,
    /^\s*(?:DROP|TRUNCATE|DELETE)\b/im,
    `${name} must remain additive and non-destructive`,
  );
}

assert.match(funnel, /CREATE TABLE public\.first_party_funnel_events/);
assert.match(funnel, /event_id\s+VARCHAR\(160\) NOT NULL UNIQUE/);
assert.match(funnel, /ALTER TABLE public\.first_party_funnel_events ENABLE ROW LEVEL SECURITY/);
assert.match(funnel, /REVOKE ALL ON TABLE public\.first_party_funnel_events FROM anon, authenticated/);
assert.match(funnel, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.first_party_funnel_events TO service_role/);
assert.doesNotMatch(
  funnel,
  /CREATE POLICY[\s\S]*first_party_funnel_events/i,
  "funnel table must not expose a client RLS policy",
);
assert.match(funnel, /CREATE OR REPLACE FUNCTION public\.link_first_party_funnel_identity/);
assert.match(funnel, /GRANT EXECUTE ON FUNCTION public\.link_first_party_funnel_identity\(UUID, UUID\) TO service_role/);

for (const column of [
  "include_in_insights BOOLEAN NOT NULL DEFAULT false",
  "include_in_stelloquy BOOLEAN NOT NULL DEFAULT false",
  "memory_pinned BOOLEAN NOT NULL DEFAULT false",
  "memory_importance SMALLINT",
]) {
  assert.ok(consent.includes(column), `0039 must define ${column}`);
}
assert.match(consent, /SET include_in_stelloquy = oracle_memory/);
assert.doesNotMatch(
  consent,
  /SET include_in_insights = oracle_memory/,
  "legacy recall must never broaden Insights consent",
);
assert.match(consent, /CREATE TABLE public\.journal_entry_consent_audit/);
assert.match(consent, /SECURITY DEFINER[\s\S]*SET search_path = ''/);
assert.match(consent, /ALTER TABLE public\.journal_entry_consent_audit ENABLE ROW LEVEL SECURITY/);
assert.match(consent, /CREATE POLICY "own_journal_consent_audit_select"/);

for (const typeContract of [
  "first_party_funnel_events:",
  "journal_entry_consent_audit:",
  "include_in_insights: boolean",
  "include_in_stelloquy: boolean",
  "memory_pinned: boolean",
  "link_first_party_funnel_identity:",
]) {
  assert.ok(databaseTypes.includes(typeContract), `database types must include ${typeContract}`);
}

console.log("Wave 1 migration invariants passed (0038/0039 are additive and fail closed).");
