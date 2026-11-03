import 'server-only'

import { loadPeriodReviewSources, type PeriodReviewSourceBundle } from './load-sources'
import type { PeriodReviewPeriod } from './periods'
import { buildSourceChips, type PeriodReviewSourceChips } from './report-schema'

/**
 * What a look back will draw on, shown before the member asks for one. The
 * same source chips the finished review carries, so the preview and the
 * result always agree. No model call. null when the sources can't be loaded.
 */
export async function loadLookBackPreview(
  userId: string,
  period: PeriodReviewPeriod,
  adjust?: (sources: PeriodReviewSourceBundle) => PeriodReviewSourceBundle,
): Promise<PeriodReviewSourceChips | null> {
  try {
    const sources = await loadPeriodReviewSources(userId, period)
    return buildSourceChips(adjust ? adjust(sources) : sources)
  } catch (error) {
    console.error('[period-review] preview unavailable:', error)
    return null
  }
}
