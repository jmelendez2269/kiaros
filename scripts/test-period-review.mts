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
  resolvePeriodReviewVaultForSave,
} from '../lib/period-review/cache-vault.ts'
import { PeriodReviewCacheStorageFullError } from '../lib/period-review/cache-errors.ts'
import {
  isMissingPeriodReviewsTableError,
  periodReviewVaultAvailableForStorage,
  resolvePeriodReviewStorageBackend,
} from '../lib/period-review/period-reviews-table-errors.ts'
import {
  periodReviewEntryFromPayload,
  periodReviewPayloadFromEntry,
} from '../lib/period-review/period-reviews-payload.ts'
import { runPeriodReviewGeneration } from '../lib/period-review/generate-and-cache.ts'
import {
  consentStripJournalQuotesFromAuthoredRow,
  relocatePeriodReviewCacheOffAuthoredRows,
} from '../lib/period-review/cache-snapshot.ts'
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
  periodReviewStorageFullLine1,
  periodReviewStorageFullLine2,
  periodReviewStorageFullApiMessage,
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
assert.deepEqual(resolvePeriodReviewVaultForSave(allAuthored, 4), { ok: false, reason: 'migration_required' })

assert.equal(isMissingPeriodReviewsTableError({ code: '42P01', message: 'undefined_table' }), true)
assert.equal(isMissingPeriodReviewsTableError({ code: 'PGRST205', message: "Could not find the table 'public.period_reviews'" }), true)
assert.equal(isMissingPeriodReviewsTableError({ code: '23505', message: 'duplicate key' }), false)
assert.equal(resolvePeriodReviewStorageBackend({ code: 'PGRST205', message: 'period_reviews' }), 'legacy')
assert.equal(resolvePeriodReviewStorageBackend(null), 'table')
assert.equal(periodReviewVaultAvailableForStorage('table', false), true)
assert.equal(periodReviewVaultAvailableForStorage('legacy', false), false)
assert.equal(periodReviewVaultAvailableForStorage('legacy', true), true)

const sampleEntry = {
  summary: 'Hello',
  generatedAt: '2026-10-31T12:00:00Z',
  model: 'claude-sonnet-4-6',
  regenerations: 1,
  sections: { sky: 'Calm' },
  sourceChips: { sky: ['1 retrograde'], plans: [], journal: [] },
}
const roundTrip = periodReviewEntryFromPayload(periodReviewPayloadFromEntry(sampleEntry))
assert.deepEqual(roundTrip, sampleEntry)

let modelGenerateCalled = false
const vaultFullRun = await runPeriodReviewGeneration({
  assertVaultAvailable: async () => {
    throw new PeriodReviewCacheStorageFullError()
  },
  generateSummary: async () => {
    modelGenerateCalled = true
    return {
      summary: 'should not run',
      sections: { sky: 'x' },
      sourceChips: { sky: [], plans: [], journal: [] },
      model: 'test',
    }
  },
  saveEntry: async () => {
    throw new Error('save should not run when vault full')
  },
  buildEntry: (generated) => ({
    summary: generated.summary,
    generatedAt: new Date().toISOString(),
    model: generated.model,
    regenerations: 0,
    sections: generated.sections,
    sourceChips: generated.sourceChips,
  }),
})
assert.deepEqual(vaultFullRun, { ok: false, reason: 'storage_full' })
assert.equal(modelGenerateCalled, false)

const nov = periodFor('month', 2026, 11)
assert.equal(isPeriodEnded('2026-11-30', nov), false)
assert.equal(isPeriodEnded('2026-12-01', nov), true)
const decQ4 = periodFor('quarter', 2026, 4)
assert.equal(isPeriodEnded('2026-12-31', decQ4), false)
assert.equal(isPeriodEnded('2027-01-01', decQ4), true)

assert.equal(periodReviewCacheEntryQuotesJournal({ sections: { inYourWords: 'Dear diary' } }), true)
assert.equal(periodReviewCacheEntryQuotesJournal({ sourceChips: { journal: ['1 journal entry'] } }), true)
assert.equal(periodReviewCacheEntryQuotesJournal({ sections: { sky: 'Only sky' } }), false)

const authoredRowWithJournalCache = {
  quarter: 2,
  completed_at: '2026-06-30T00:00:00Z',
  wins: ['Shipped the thing'],
  challenges: ['Scope creep'],
  pivots: 'Stay smaller',
  next_quarter_intentions: 'Rest more',
  stats_snapshot: {
    journal_entries_count: 5,
    periodReviewCache: {
      'month:2026-10-01': {
        summary: 'j',
        generatedAt: '2026-10-31T12:00:00Z',
        model: 'm',
        regenerations: 0,
        sections: { inYourWords: 'Dear diary' },
      },
      'month:2026-04-01': {
        summary: 'sky only',
        generatedAt: '2026-04-30T12:00:00Z',
        model: 'm',
        regenerations: 0,
        sections: { sky: 'Calm skies' },
      },
    },
  },
}
const authoredBefore = JSON.parse(JSON.stringify(authoredRowWithJournalCache))
const { row: authoredAfter, removed: journalRemoved } = consentStripJournalQuotesFromAuthoredRow(authoredRowWithJournalCache)
assert.equal(journalRemoved, 1)
assert.equal(JSON.stringify(authoredAfter.wins), JSON.stringify(authoredBefore.wins))
assert.equal(JSON.stringify(authoredAfter.challenges), JSON.stringify(authoredBefore.challenges))
assert.equal(authoredAfter.pivots, authoredBefore.pivots)
assert.equal(authoredAfter.next_quarter_intentions, authoredBefore.next_quarter_intentions)
assert.equal(authoredAfter.completed_at, authoredBefore.completed_at)
assert.equal(authoredAfter.quarter, authoredBefore.quarter)
const beforeStats = authoredBefore.stats_snapshot as Record<string, unknown>
const afterStats = authoredAfter.stats_snapshot as Record<string, unknown>
for (const key of Object.keys(beforeStats)) {
  if (key === PERIOD_REVIEW_CACHE_KEY) continue
  assert.equal(JSON.stringify(afterStats[key]), JSON.stringify(beforeStats[key]), `stats key ${key} must be unchanged`)
}
const afterCache = readCacheFromStatsSnapshot(afterStats)
assert.equal(afterCache['month:2026-10-01'], undefined)
assert.ok(afterCache['month:2026-04-01'])

const authoredWithCacheOnQ2 = {
  quarter: 2,
  completed_at: '2026-06-30T00:00:00Z',
  wins: ['Win'],
  challenges: [],
  pivots: null,
  next_quarter_intentions: null,
  stats_snapshot: {
    journal_entries_count: 3,
    periodReviewCache: {
      'month:2026-05-01': {
        summary: 'May look back',
        generatedAt: '2026-05-31T12:00:00Z',
        model: 'm',
        regenerations: 0,
      },
    },
  },
}
const relocateResult = relocatePeriodReviewCacheOffAuthoredRows([authoredWithCacheOnQ2], 2)
assert.equal(relocateResult.vaultQuarter, 1)
assert.deepEqual(relocateResult.relocatedKeys, ['month:2026-05-01'])
const q2AfterRelocate = relocateResult.updatedRows.find((r) => r.quarter === 2)!
assert.equal(readCacheFromStatsSnapshot(q2AfterRelocate.stats_snapshot)['month:2026-05-01'], undefined)
assert.equal((q2AfterRelocate.stats_snapshot as Record<string, unknown>).journal_entries_count, 3)
const q1Vault = relocateResult.updatedRows.find((r) => r.quarter === 1)!
assert.ok(readCacheFromStatsSnapshot(q1Vault.stats_snapshot)['month:2026-05-01'])

assert.equal(chipRetrogrades(1), '1 retrograde')
assert.equal(chipRetrogrades(3), '3 retrogrades')
assert.equal(chipRetrogrades(0), null)
assert.equal(chipJournalEntries(1), '1 journal entry')
assert.equal(chipJournalEntries(15), '15 journal entries')
assert.equal(chipPlans(2), '2 plans done')
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
assert.ok(chips.plans.includes('30 plans done'))
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

assert.equal(periodReviewStorageFullLine1(), "We couldn't save this review yet. Your earlier reviews are all still here.")
assert.equal(periodReviewStorageFullLine2(), "We're adding room for more. Check back soon to save this one.")
assert.ok(periodReviewStorageFullApiMessage().includes(periodReviewStorageFullLine1()))

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
