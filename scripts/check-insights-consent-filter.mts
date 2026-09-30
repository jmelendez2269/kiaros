/**
 * check-insights-consent-filter.mts
 *
 * Static verification that all journal-body loaders feeding Patterns,
 * pattern AI synthesis, pattern evidence, and quarterly reviews ALWAYS
 * filter to `include_in_insights = true`, regardless of the
 * KIAROS_JOURNAL_CONSENT_V2 flag state.
 *
 * The fix removes flag-gating from these loaders so a flag rollback
 * cannot leak non-consented bodies through pattern summaries.
 */

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const AFFECTED_FILES = [
  'lib/ai/journal-insight-synthesis.ts',
  'app/(app)/insights/map/page.tsx',
  'lib/ai/quarterly-review-generator.ts',
]

async function checkFile(
  path: string,
  checks: Array<{ description: string; mustContain: string; mustNotContain?: string }>,
): Promise<void> {
  const content = await readFile(path, 'utf-8')

  for (const check of checks) {
    assert(
      content.includes(check.mustContain),
      `${path}: ${check.description} — missing required string:\n${check.mustContain}`,
    )
    if (check.mustNotContain) {
      assert(
        !content.includes(check.mustNotContain),
        `${path}: ${check.description} — found forbidden string:\n${check.mustNotContain}`,
      )
    }
  }
}

async function main() {
  // 1. lib/ai/journal-insight-synthesis.ts — loadEntriesForPattern
  await checkFile('lib/ai/journal-insight-synthesis.ts', [
    {
      description: 'loadEntriesForPattern must always filter to include_in_insights',
      mustContain: ".eq('include_in_insights', true)",
      mustNotContain: "if (isJournalConsentV2Enabled()) {\n    entriesQuery = entriesQuery.eq('include_in_insights', true)",
    },
    {
      description: 'synthesizeInsight must check entries.length === 0 without flag gate',
      mustContain: 'if (pattern.entries.length === 0) {\n    throw new Error',
      mustNotContain: 'if (isJournalConsentV2Enabled() && pattern.entries.length === 0) {',
    },
    {
      description: 'synthesizePreview must check entries.length === 0 without flag gate',
      mustContain: 'if (entries.length === 0) return null',
      mustNotContain: 'if (isJournalConsentV2Enabled() && entries.length === 0) return null',
    },
    {
      description: 'regenerateAllForUser must check entries.length === 0 without flag gate in worker',
      mustContain: 'if (entries.length === 0) {\n          await admin',
      mustNotContain: 'if (isJournalConsentV2Enabled() && entries.length === 0) {\n          await admin',
    },
    {
      description: 'resyncPatternSynthesisForTargets must check entries.length === 0 without flag gate',
      mustContain: 'if (entries.length === 0) {\n          await admin\n            .from',
      mustNotContain: 'if (isJournalConsentV2Enabled() && entries.length === 0) {\n          await admin',
    },
  ])

  // 2. app/(app)/insights/map/page.tsx — pattern evidence bodies
  await checkFile('app/(app)/insights/map/page.tsx', [
    {
      description: 'Pattern evidence bodies must always filter to include_in_insights',
      mustContain: ".eq('include_in_insights', true)",
      mustNotContain: "if (consentV2Enabled) {\n      entryBodiesQuery = entryBodiesQuery.eq('include_in_insights', true)",
    },
  ])

  // 3. lib/ai/quarterly-review-generator.ts — quarterly review journal count
  await checkFile('lib/ai/quarterly-review-generator.ts', [
    {
      description: 'Quarterly review journal entry count must always filter to include_in_insights',
      mustContain: ".eq('include_in_insights', true)\n      .gte('entry_date', start)\n      .lte('entry_date', end),",
      mustNotContain: "if (isJournalConsentV2Enabled()) {\n    journalEntriesQuery = journalEntriesQuery.eq('include_in_insights', true)",
    },
  ])

  console.log('✓ All insights consent filters are flag-independent and always applied')
  console.log(`  Verified ${AFFECTED_FILES.length} files:`)
  for (const file of AFFECTED_FILES) {
    console.log(`    - ${file}`)
  }
}

main().catch((err) => {
  console.error('Insights consent filter check failed:', err.message)
  process.exit(1)
})
