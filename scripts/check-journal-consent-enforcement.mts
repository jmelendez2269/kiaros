import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const paths = {
  functionMigration: new URL('../supabase/migrations/0040_journal_consent_enforcement.sql', import.meta.url),
  cleanupMigration: new URL('../supabase/migrations/0041_journal_consent_cleanup.sql', import.meta.url),
  entryService: new URL('../lib/journal/entry-service.ts', import.meta.url),
  synthesis: new URL('../lib/ai/journal-insight-synthesis.ts', import.meta.url),
  rebuild: new URL('../lib/journal/derived-rebuild.ts', import.meta.url),
  consentRoute: new URL('../app/api/journal/[id]/consent/route.ts', import.meta.url),
  oracleChat: new URL('../app/api/oracle/chat/route.ts', import.meta.url),
  monthBrief: new URL('../lib/ai/month-brief-generator.ts', import.meta.url),
  quarterlyReview: new URL('../lib/ai/quarterly-review-generator.ts', import.meta.url),
}

const [
  functionSql,
  cleanupSql,
  entryService,
  synthesis,
  rebuild,
  consentRoute,
  oracleChat,
  monthBrief,
  quarterlyReview,
] =
  await Promise.all(Object.values(paths).map((path) => readFile(path, 'utf8')))

for (const [name, sql] of [
  ['0040', functionSql],
  ['0041', cleanupSql],
]) {
  assert.match(sql, /^BEGIN;/m, `${name} must begin transactionally`)
  assert.match(sql, /^COMMIT;$/m, `${name} must commit transactionally`)
}

assert.match(functionSql, /CREATE OR REPLACE FUNCTION public\.refresh_user_pattern_insight/)
assert.equal(
  (functionSql.match(/je\.include_in_insights = true/g) ?? []).length,
  8,
  '0040 must gate all four count queries and all four evidence queries',
)
assert.doesNotMatch(functionSql, /DELETE FROM public\.month_briefs/)
assert.doesNotMatch(functionSql, /DELETE FROM public\.user_pattern_insights;\s*$/m)

assert.match(cleanupSql, /DELETE FROM public\.user_pattern_insights/)
assert.match(cleanupSql, /DELETE FROM public\.month_briefs WHERE edited_at IS NULL/)
assert.match(cleanupSql, /UPDATE public\.quarterly_reviews SET ai_summary = NULL/)
assert.doesNotMatch(cleanupSql, /(?:DELETE FROM|UPDATE) public\.journal_entries/)
assert.doesNotMatch(cleanupSql, /(?:DELETE FROM|UPDATE) public\.blueprints/)

assert.match(entryService, /shouldRefreshPatterns = !consentV2Enabled \|\| consent\.state\.include_in_insights/)
assert.match(entryService, /if \(!shouldRefreshPatterns\) return \{ success: true, data \}/)
assert.match(synthesis, /entriesQuery = entriesQuery\.eq\('include_in_insights', true\)/)
assert.match(synthesis, /No consented journal evidence is available for synthesis/)
assert.match(oracleChat, /\? 'include_in_stelloquy'[\s\S]*: 'oracle_memory'/)
assert.match(monthBrief, /!isJournalConsentV2Enabled\(\) && priorBriefRes\.data\?\.brief_text/)
assert.match(quarterlyReview, /journalEntriesQuery = journalEntriesQuery\.eq\('include_in_insights', true\)/)

assert.match(rebuild, /\.eq\('include_in_insights', true\)/)
assert.match(rebuild, /\.delete\(\)\.eq\('user_id', userProfileId\)/)
assert.doesNotMatch(rebuild, /console\.(?:log|error|warn)\([^\n]*(?:body|brief_text)/)

const invalidationIndex = consentRoute.indexOf('await invalidateJournalDerivedContent')
const updateIndex = consentRoute.indexOf(".from('journal_entries')\n    .update")
assert.ok(invalidationIndex >= 0 && updateIndex >= 0 && invalidationIndex < updateIndex)
assert.match(consentRoute, /after\(\(\) =>[\s\S]*rebuildJournalDerivedContent/)

console.log('journal consent enforcement checks passed')
