/**
 * Static checks for migration 0049 (journal memory defaults + compat trigger removal).
 */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sql = await readFile(
  new URL('../supabase/migrations/0049_journal_memory_defaults.sql', import.meta.url),
  'utf8',
)

assert.match(sql, /^BEGIN;/m)
assert.match(sql, /^COMMIT;$/m)

assert.match(
  sql,
  /DROP TRIGGER IF EXISTS trg_journal_stelloquy_consent_compat ON public\.journal_entries/,
)
assert.match(sql, /DROP FUNCTION IF EXISTS public\.sync_journal_stelloquy_consent_compat\(\)/)

assert.match(sql, /REVOKE ALL ON FUNCTION public\.bulk_apply_journal_entry_consent/)
assert.match(sql, /FROM PUBLIC, anon, authenticated/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.bulk_apply_journal_entry_consent/)
assert.match(sql, /TO service_role/)

assert.match(sql, /SET search_path = ''/m)

console.log('journal memory migration 0049 checks passed')
