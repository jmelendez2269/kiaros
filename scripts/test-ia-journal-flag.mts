/**
 * NEXT_PUBLIC_IA_JOURNAL — route helpers and next.config redirect wiring.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  iaJournalFlagEnabled,
  journalTabEntriesHref,
  journalTabLookBackHref,
  journalTabPatternsHref,
  journalTabWriteHref,
  patternsPageHref,
  resolveJournalTabKey,
  resolveLookBackSubView,
  resolvePatternsSubView,
} from '../lib/journal/ia-journal-routes.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { featureFlagEnabled } = require('../lib/calendar/feature-flag-enabled.cjs')

console.log('=== NEXT_PUBLIC_IA_JOURNAL tests ===\n')

console.log('Flag env parsing (parity with next.config CJS helper)')
for (const sample of [undefined, '', 'false', 'TRUE', ' on ', 'yes', '1']) {
  assert.equal(iaJournalFlagEnabled(sample), featureFlagEnabled(sample))
}
console.log('✓ Flag parsing\n')

console.log('Journal tab hrefs')
assert.equal(journalTabWriteHref(), '/journal')
assert.equal(journalTabEntriesHref(), '/journal/entries')
assert.equal(journalTabPatternsHref(), '/journal/patterns')
assert.equal(journalTabPatternsHref('map'), '/journal/patterns?view=map')
assert.equal(journalTabLookBackHref(), '/journal/look-back')
assert.equal(journalTabLookBackHref('year'), '/journal/look-back?view=year')
assert.equal(resolveJournalTabKey('/journal'), 'write')
assert.equal(resolveJournalTabKey('/journal/entries'), 'entries')
assert.equal(resolveJournalTabKey('/journal/patterns'), 'patterns')
assert.equal(resolveJournalTabKey('/journal/look-back'), 'look-back')
assert.equal(resolvePatternsSubView('map'), 'map')
assert.equal(resolvePatternsSubView(undefined), 'patterns')
assert.equal(resolveLookBackSubView('quarter'), 'quarter')
assert.equal(patternsPageHref(false), '/insights/map')
assert.equal(patternsPageHref(true, 'captures'), '/journal/patterns?view=captures')
console.log('✓ Route helpers\n')

console.log('next.config redirects when flag on')
const nextConfigSource = readFileSync(join(root, 'next.config.js'), 'utf8')
assert.ok(nextConfigSource.includes('NEXT_PUBLIC_IA_JOURNAL'))
assert.ok(nextConfigSource.includes('iaJournalOn'))
assert.ok(nextConfigSource.includes("destination: '/journal/patterns'"))
assert.ok(nextConfigSource.includes("destination: '/journal/entries'"))
assert.ok(nextConfigSource.includes("destination: '/journal/look-back'"))
assert.ok(nextConfigSource.includes('permanent: false'))
console.log('✓ Static redirect wiring\n')

console.log('Journal layout gated on isIaJournalEnabled')
const journalLayout = readFileSync(join(root, 'app/(app)/journal/layout.tsx'), 'utf8')
assert.ok(journalLayout.includes('isIaJournalEnabled()'))
assert.ok(journalLayout.includes('JournalIaChrome'))
console.log('✓ Layout guard\n')

console.log('All IA journal flag tests passed.')
