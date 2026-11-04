import 'server-only'

import { generateLookBackFromSources, type GeneratedLookBack } from '@/lib/ai/period-review-generator'
import type { PeriodReviewCacheEntry } from '@/lib/period-review/cache-schema'
import { periodReviewCacheEntryQuotesJournal } from '@/lib/period-review/cache-vault'
import { loadPeriodReviewSources, type PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'
import { loadLookBackPreview } from '@/lib/period-review/preview'
import type { PeriodReviewSourceChips } from '@/lib/period-review/report-schema'
import { periodReviewEntryFromPayload, periodReviewPayloadFromEntry } from '@/lib/period-review/period-reviews-payload'
import type { PeriodReviewPeriod } from '@/lib/period-review/periods'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { cycleMeaning } from './copy'
import { shortDate } from './detect'
import { collectiveCycles, loadNatalChart, personalCyclesFor } from './load'
import type { SkyCycle } from './types'

/** Finds a cycle by id among the collective cycles and this member's personal ones. */
export async function findCycleForUser(profileId: string, cycleId: string, today: string): Promise<SkyCycle | null> {
  const collective = collectiveCycles().find((c) => c.id === cycleId)
  if (collective) return collective
  if (!cycleId.startsWith('personal:')) return null
  const chart = await loadNatalChart(profileId)
  if (!chart) return null
  return personalCyclesFor(chart, today).find((c) => c.id === cycleId) ?? null
}

/**
 * The review engine works over a date window. A cycle is not a calendar month,
 * so build the window from the cycle and drop the month/quarter Blueprint themes.
 */
function windowFor(cycle: SkyCycle): PeriodReviewPeriod {
  return {
    kind: 'month',
    periodStart: cycle.startDate,
    periodEnd: cycle.endDate,
    planYear: Number(cycle.startDate.slice(0, 4)),
    index: Number(cycle.startDate.slice(5, 7)),
  }
}

const SYSTEM_ADDENDUM = `This look back covers one sky cycle (a retrograde, eclipse season, sign change, season, or a slow transit to the member's chart), not a calendar month. In "The sky", centre the cycle itself and its key dates, and mention other sky events only where they overlap it. Treat the cycle as a lens, never a cause.`

const withoutCalendarThemes = (sources: PeriodReviewSourceBundle): PeriodReviewSourceBundle => ({
  ...sources,
  monthBlueprintTheme: null,
  quarterBlueprintTheme: null,
})

/** What a cycle's look back will draw on, before it is written. */
export function previewSkyCycleReview(profileId: string, cycle: SkyCycle): Promise<PeriodReviewSourceChips | null> {
  return loadLookBackPreview(profileId, windowFor(cycle), withoutCalendarThemes)
}

export async function generateSkyCycleReview(profileId: string, cycle: SkyCycle): Promise<GeneratedLookBack> {
  const sources = await loadPeriodReviewSources(profileId, windowFor(cycle))
  const context = [
    `The cycle: ${cycle.title}, ${cycle.subtitle}.`,
    `Key dates: ${cycle.keyDates.map(shortDate).join(', ')}.`,
    `How it is often read: ${cycleMeaning(cycle)}`,
  ].join('\n')
  return generateLookBackFromSources(
    profileId,
    withoutCalendarThemes(sources),
    { title: `${cycle.title} (${cycle.subtitle})`, carryLabel: null, context },
    SYSTEM_ADDENDUM,
  )
}

export async function loadSkyCycleReview(profileId: string, cycleId: string): Promise<PeriodReviewCacheEntry | null> {
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('sky_cycle_reviews')
    .select('payload')
    .eq('user_id', profileId)
    .eq('cycle_id', cycleId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load sky cycle review: ${error.message}`)
  return data ? periodReviewEntryFromPayload(data.payload) : null
}

export async function saveSkyCycleReview(profileId: string, cycle: SkyCycle, entry: PeriodReviewCacheEntry): Promise<void> {
  const admin = createAdminSupabase()
  const { error } = await admin.from('sky_cycle_reviews').upsert(
    {
      user_id: profileId,
      cycle_id: cycle.id,
      cycle_kind: cycle.kind,
      start_date: cycle.startDate,
      end_date: cycle.endDate,
      payload: periodReviewPayloadFromEntry(entry),
      quotes_journal: periodReviewCacheEntryQuotesJournal(entry),
    },
    { onConflict: 'user_id,cycle_id' },
  )
  if (error) throw new Error(`Failed to save sky cycle review: ${error.message}`)
}

/** Cycle ids this member has a saved look back for, among the given ids. */
export async function savedSkyCycleReviewIds(profileId: string, cycleIds: string[]): Promise<Set<string>> {
  if (cycleIds.length === 0) return new Set()
  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('sky_cycle_reviews')
    .select('cycle_id')
    .eq('user_id', profileId)
    .in('cycle_id', cycleIds)
  if (error) throw new Error(`Failed to load saved sky cycle reviews: ${error.message}`)
  return new Set((data ?? []).map((row: { cycle_id: string }) => row.cycle_id))
}
