import type { EphemerisDay, YearEphemeris } from '@/types/blueprint'
import { findEphemerisDay } from '@/lib/journal/intelligence'

export type EntrySkyDayResult =
  | { day: EphemerisDay; source: 'cache' | 'computed' }
  | { day: null; source: 'missing'; reason: string }

/**
 * Finds the sky for a journal entry's date. A member's ephemeris cache is only
 * written when their Blueprint is generated, so a brand-new member (or one whose
 * cache does not reach the date) has no row for it. In that case the day is
 * computed directly instead of silently saving the entry unstamped.
 */
export function resolveEntrySkyDay(opts: {
  cached: YearEphemeris | null
  entryDate: string
  compute: () => EphemerisDay | null
}): EntrySkyDayResult {
  const fromCache = findEphemerisDay(opts.cached, opts.entryDate)
  if (fromCache) return { day: fromCache, source: 'cache' }

  try {
    const computed = opts.compute()
    if (computed && computed.date === opts.entryDate) return { day: computed, source: 'computed' }
    return { day: null, source: 'missing', reason: 'computation returned no day for the entry date' }
  } catch (error) {
    return {
      day: null,
      source: 'missing',
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

/** supabase-js returns `{ error }` rather than throwing; collect those so they can be logged. */
export function collectRpcErrors(
  results: ReadonlyArray<{ error: { message: string } | null }>,
): string[] {
  return results.flatMap((result) => (result.error ? [result.error.message] : []))
}

/** The YYYY-MM-DD calendar date in `timeZone`; an unknown zone falls back to `fallbackTimeZone`. */
export function localDateInTimeZone(
  now: Date,
  timeZone: string | null | undefined,
  fallbackTimeZone = 'America/New_York',
): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  try {
    return format(timeZone || fallbackTimeZone)
  } catch {
    return format(fallbackTimeZone)
  }
}
