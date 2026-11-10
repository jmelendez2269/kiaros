import 'server-only'
import { generateLookBackFromSources } from '@/lib/ai/period-review-generator'
import { loadPeriodReviewSources } from '@/lib/period-review/load-sources'
import { periodLabel, type ReflectionPeriod } from './periods'
import type { SkyReading } from './report-schema'
import { lookBackWindow, usesCalendarThemes } from './sky-window'
import { skyReadingAddendum } from '@/lib/ai/reflection-sky-prompt'

/**
 * The sky the member moved through in a period, read against their own chart
 * and whatever plans and check-ins exist. Written for every reflection, so a
 * period with nothing recorded still has something true to show.
 */
export async function generateSkyReading(userId: string, period: ReflectionPeriod, hasLivedReflection: boolean): Promise<SkyReading> {
  const loaded = await loadPeriodReviewSources(userId, lookBackWindow(period))
  const sources = usesCalendarThemes(period.kind) ? loaded : { ...loaded, monthBlueprintTheme: null, quarterBlueprintTheme: null }
  const generated = await generateLookBackFromSources(
    userId,
    sources,
    {
      title: period.kind === 'year' ? `the year ${period.start.slice(0, 4)}` : periodLabel(period),
      // A reflection is often read well after its period, so only a month names what came next.
      carryLabel: period.kind === 'month' ? undefined : null,
    },
    skyReadingAddendum(period.kind, hasLivedReflection),
    'reflection',
  )
  return { sections: generated.sections, sourceChips: generated.sourceChips, model: generated.model }
}
