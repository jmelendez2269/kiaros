/**
 * Period review — periods, cache merge, flags, QR row classification.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  pickPeriodReviewVaultQuarter,
  periodReviewCacheEntryQuotesJournal,
} from '../lib/period-review/cache-vault.ts'
import {
  cacheKey,
  isPromoWindow,
  latestClosedMonth,
  periodFor,
  addDays,
  isPeriodEnded,
} from '../lib/period-review/periods.ts'
import {
  mergeStatsSnapshotPreserveCache,
  readCacheFromStatsSnapshot,
  PERIOD_REVIEW_CACHE_KEY,
} from '../lib/period-review/cache-schema.ts'
import { periodReviewPublicFlagEnabled } from '../lib/period-review/flag.ts'
import { formQuarterStatus, hasAuthoredQuarterlyReviewContent, isPeriodReviewCacheOnlyRow } from '../lib/reviews/quarter-review-row.ts'
import {
  buildQuarterlyReviewGetResponse,
  formQuarterlyReviewRowCountsAsExisting,
  indexFormQuarterlyReviewsByQuarter,
  legacyQuarterlyReviewRowCountsAsExisting,
} from '../lib/reviews/quarterly-review-get.ts'
import {
  todayCardHeadline,
  todayCardSubline,
  todayCardButtonLabel,
  emptyJournalBanner,
} from '../lib/period-review/copy.ts'
import { sanitizePeriodReviewOutput } from '../lib/period-review/sanitize-output.ts'
import {
  chipCheckIns,
  chipJournalEntries,
  chipPlans,
  chipRetrogrades,
} from '../lib/period-review/chip-copy.ts'
import { buildSourceChips } from '../lib/period-review/report-schema.ts'
import type { PeriodReviewSourceBundle } from '../lib/period-review/load-sources.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

console.log('=== period review tests ===\n')

const oct = periodFor('month', 2026, 10)
assert.equal(oct.periodStart, '2026-10-01')
assert.equal(oct.periodEnd, '2026-10-31')
assert.equal(cacheKey(oct), 'month:2026-10-01')

assert.equal(isPromoWindow('2026-10-31', oct), true)
assert.equal(isPromoWindow('2026-11-07', oct), true)
assert.equal(isPromoWindow('2026-11-08', oct), false)
assert.equal(isPromoWindow('2026-10-30', oct), false)

const q4 = periodFor('quarter', 2026, 4)
assert.equal(q4.periodEnd, '2026-12-31')
assert.equal(isPromoWindow('2026-12-31', q4), true)
assert.equal(isPromoWindow(addDays(q4.periodEnd, 7), q4), true)

const closed = latestClosedMonth('2026-10-15')
assert.equal(closed.index, 9)
assert.equal(closed.periodStart, '2026-09-01')

const merged = mergeStatsSnapshotPreserveCache(
  { daily_logs_count: 1, [PERIOD_REVIEW_CACHE_KEY]: { 'month:2026-10-01': { summary: 'hi', generatedAt: 't', model: 'm', regenerations: 0 } } },
  { daily_logs_count: 2, journal_entries_count: 3 },
)
assert.equal(merged.daily_logs_count, 2)
const cache = readCacheFromStatsSnapshot(merged)
assert.equal(cache['month:2026-10-01']?.summary, 'hi')

assert.equal(periodReviewPublicFlagEnabled('true'), true)
assert.equal(periodReviewPublicFlagEnabled(undefined), false)

assert.equal(hasAuthoredQuarterlyReviewContent({ wins: [], challenges: [] }), false)
assert.equal(formQuarterStatus({ completed_at: null, wins: [] }, 2, 3), 'not-started')

const monthCacheRow = {
  quarter: 4,
  completed_at: null,
  wins: [],
  challenges: [],
  pivots: null,
  next_quarter_intentions: null,
  ai_summary: null,
  stats_snapshot: {
    periodReviewCache: {
      'month:2026-10-01': { summary: 'cached', generatedAt: '2026-11-01T00:00:00Z', model: 'm', regenerations: 0 },
    },
  },
}
assert.equal(isPeriodReviewCacheOnlyRow(monthCacheRow), true)
assert.equal(legacyQuarterlyReviewRowCountsAsExisting(monthCacheRow), true)
assert.equal(formQuarterlyReviewRowCountsAsExisting(monthCacheRow), false)
assert.deepEqual(buildQuarterlyReviewGetResponse(monthCacheRow), { exists: false })
assert.equal(formQuarterStatus(monthCacheRow, 4, 4), 'not-started')

const formDraftRow = {
  quarter: 2,
  completed_at: null,
  wins: ['Shipped the journal refresh'],
  challenges: [],
  pivots: null,
  next_quarter_intentions: null,
  ai_summary: null,
  stats_snapshot: null,
}
const formCompleteRow = {
  quarter: 1,
  completed_at: '2026-06-30T12:00:00Z',
  wins: ['Closed Q1'],
  challenges: [],
  pivots: null,
  next_quarter_intentions: null,
  ai_summary: 'You closed the quarter with momentum.',
  stats_snapshot: { journal_entries_count: 12 },
}

assert.equal(isPeriodReviewCacheOnlyRow(formCompleteRow), false)
assert.equal(buildQuarterlyReviewGetResponse(formCompleteRow).exists, true)

const mixedTable = [formDraftRow, monthCacheRow, formCompleteRow]
const legacyMap = new Map<number, (typeof mixedTable)[number]>()
for (const row of mixedTable) legacyMap.set(row.quarter, row)
const formMap = indexFormQuarterlyReviewsByQuarter(mixedTable)
assert.ok(legacyMap.get(4))
assert.equal(formMap.get(4), undefined)
assert.equal(formMap.get(2)?.wins, formDraftRow.wins)
assert.equal(formQuarterStatus(formMap.get(2) ?? null, 2, 3), 'draft')
assert.equal(formQuarterStatus(formMap.get(4) ?? null, 4, 4), 'not-started')

const authoredQ2 = {
  quarter: 2,
  completed_at: '2026-06-30T00:00:00Z',
  wins: ['Win'],
  challenges: [],
  pivots: null,
  next_quarter_intentions: null,
  stats_snapshot: { journal_entries_count: 3 },
}
const cacheQ4 = {
  quarter: 4,
  completed_at: null,
  wins: [],
  challenges: [],
  pivots: null,
  next_quarter_intentions: null,
  stats_snapshot: { periodReviewCache: { 'month:2026-10-01': { summary: 'x', generatedAt: 't', model: 'm', regenerations: 0 } } },
}
const cacheQ2 = {
  quarter: 2,
  completed_at: null,
  wins: [],
  challenges: [],
  pivots: null,
  next_quarter_intentions: null,
  stats_snapshot: { periodReviewCache: { 'month:2026-04-01': { summary: 'x', generatedAt: 't', model: 'm', regenerations: 0 } } },
}
assert.deepEqual(pickPeriodReviewVaultQuarter([authoredQ2], 2), { ok: true, vaultQuarter: 1 })
assert.deepEqual(pickPeriodReviewVaultQuarter([authoredQ2, cacheQ4], 2), { ok: true, vaultQuarter: 1 })
assert.deepEqual(pickPeriodReviewVaultQuarter([], 3), { ok: true, vaultQuarter: 3 })
assert.deepEqual(pickPeriodReviewVaultQuarter([cacheQ2], 2), { ok: true, vaultQuarter: 2 })
const allAuthored = [1, 2, 3, 4].map((quarter) => ({
  quarter,
  completed_at: '2026-01-01',
  wins: ['a'],
  challenges: [],
  pivots: null,
  next_quarter_intentions: null,
  stats_snapshot: null,
}))
assert.deepEqual(pickPeriodReviewVaultQuarter(allAuthored, 4), { ok: false, reason: 'migration_required' })

const nov = periodFor('month', 2026, 11)
assert.equal(isPeriodEnded('2026-11-30', nov), false)
assert.equal(isPeriodEnded('2026-12-01', nov), true)
const decQ4 = periodFor('quarter', 2026, 4)
assert.equal(isPeriodEnded('2026-12-31', decQ4), false)
assert.equal(isPeriodEnded('2027-01-01', decQ4), true)

assert.equal(periodReviewCacheEntryQuotesJournal({ sections: { inYourWords: 'Dear diary' } }), true)
assert.equal(periodReviewCacheEntryQuotesJournal({ sourceChips: { journal: ['1 journal entry'] } }), true)
assert.equal(periodReviewCacheEntryQuotesJournal({ sections: { sky: 'Only sky' } }), false)

assert.equal(chipRetrogrades(1), '1 retrograde')
assert.equal(chipRetrogrades(3), '3 retrogrades')
assert.equal(chipRetrogrades(0), null)
assert.equal(chipJournalEntries(1), '1 journal entry')
assert.equal(chipJournalEntries(15), '15 journal entries')
assert.equal(chipPlans(2), '2 plans')
assert.equal(chipCheckIns(1), '1 check-in')

const chipSources = {
  period: oct,
  displayName: 'Alex',
  sky: {
    moonPhases: [{}, {}, {}] as PeriodReviewSourceBundle['sky']['moonPhases'],
    retrogradePeriods: [{}] as PeriodReviewSourceBundle['sky']['retrogradePeriods'],
    significantTransits: [],
    eclipseCount: 0,
    signChangeCount: 0,
    text: '',
  },
  planTasksCompleted: [],
  planTasksOpen: [],
  planTasksCompletedCount: 30,
  planTasksOpenCount: 5,
  planTasksTotal: 35,
  dailyLogDays: 4,
  goalsActive: 2,
  goalsCompletedInPeriod: 1,
  journalEntryCount: 20,
  journalExcerpts: [],
  quarterBlueprintTheme: null,
  monthBlueprintTheme: null,
} satisfies PeriodReviewSourceBundle

const chips = buildSourceChips(chipSources)
assert.ok(chips.plans.includes('30 plans'))
assert.ok(chips.journal.includes('20 journal entries'))
assert.equal(chips.sky.includes('1 retrograde'), true)
assert.equal(chips.sky.some((c) => c.includes('moon phase')), true)

assert.equal(todayCardHeadline(oct), 'October is wrapping up')
assert.equal(todayCardSubline(oct), "Want to look back on it? We'll gather the sky, your plans, goals and check-ins into one view.")
assert.equal(todayCardButtonLabel(oct), 'Look back on October')
assert.equal(
  emptyJournalBanner(oct),
  'There are no journal entries for October, so this look back draws on the sky, your plans, goals and check-ins.',
)

assert.equal(sanitizePeriodReviewOutput('A & B—C'), 'A and B, C')

const systemPrompt = readFileSync(join(root, 'lib/ai/period-review-system-prompt.ts'), 'utf8')
assert.ok(systemPrompt.includes('workshop "we" voice'))
assert.ok(systemPrompt.includes('The sky'))

const featureFlags = readFileSync(join(root, 'lib/feature-flags.ts'), 'utf8')
assert.ok(featureFlags.includes('isPeriodReviewEnabled'))
assert.ok(featureFlags.includes('NEXT_PUBLIC_KIAROS_PERIOD_REVIEW'))

const nextConfig = readFileSync(join(root, 'next.config.js'), 'utf8')
assert.ok(nextConfig.includes('NEXT_PUBLIC_KIAROS_PERIOD_REVIEW'))
assert.ok(nextConfig.includes('cursor/period-review-01-3c9a'))

console.log('All period review tests passed.')
