import { z } from 'zod'
import type { PeriodReviewSourceBundle } from './load-sources'
import {
  chipCheckIns,
  chipEclipses,
  chipGoals,
  chipJournalEntries,
  chipStelloquyCaptures,
  chipMoonPhases,
  chipPlans,
  chipRetrogrades,
  chipSignChanges,
} from './chip-copy'

export const periodReviewSectionsSchema = z.object({
  sky: z.string().min(1).optional(),
  plansAndGoals: z.string().min(1).optional(),
  inYourWords: z.string().min(1).optional(),
  questionToCarry: z.string().min(1).optional(),
})

export type PeriodReviewSections = z.infer<typeof periodReviewSectionsSchema>

export type PeriodReviewSourceChips = {
  sky: string[]
  plans: string[]
  journal: string[]
  /** Major transits to the member's own chart. Absent on reviews saved before 2026-11. */
  personal?: string[]
}

export function buildSourceChips(sources: PeriodReviewSourceBundle): PeriodReviewSourceChips {
  // Name the major collective transits when we have them; fall back to counts.
  const sky = sources.majorTransits
    ? [...sources.majorTransits.collective, chipMoonPhases(sources.sky.moonPhases.length)].filter(
        (c): c is string => Boolean(c),
      )
    : [
        chipRetrogrades(sources.sky.retrogradePeriods.length),
        chipMoonPhases(sources.sky.moonPhases.length),
        chipEclipses(sources.sky.eclipseCount),
        chipSignChanges(sources.sky.signChangeCount),
      ].filter((c): c is string => Boolean(c))
  const personal = sources.majorTransits?.personal ?? []

  const plans = [
    chipPlans(sources.planTasksCompletedCount),
    chipCheckIns(sources.dailyLogDays),
    chipGoals(sources.goalsCompletedInPeriod),
  ].filter((c): c is string => Boolean(c))

  const journal = [
    chipJournalEntries(sources.journalEntryCount),
    chipStelloquyCaptures(sources.captureCount ?? 0),
  ].filter((c): c is string => Boolean(c))

  return { sky, plans, journal, personal }
}

export function flattenPeriodReviewSections(sections: PeriodReviewSections): string {
  const parts: string[] = []
  if (sections.sky?.trim()) parts.push(`The sky\n\n${sections.sky.trim()}`)
  if (sections.plansAndGoals?.trim()) parts.push(`Your plans and goals\n\n${sections.plansAndGoals.trim()}`)
  if (sections.inYourWords?.trim()) parts.push(`In your words\n\n${sections.inYourWords.trim()}`)
  if (sections.questionToCarry?.trim()) parts.push(`A question to carry\n\n${sections.questionToCarry.trim()}`)
  return parts.join('\n\n')
}

export function parseLegacySummarySections(summary: string): PeriodReviewSections {
  const headers = ['The sky', 'Your plans and goals', 'In your words', 'A question to carry'] as const
  const keys: (keyof PeriodReviewSections)[] = ['sky', 'plansAndGoals', 'inYourWords', 'questionToCarry']
  const out: PeriodReviewSections = {}
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    const start = summary.indexOf(header)
    if (start === -1) continue
    let end = summary.length
    for (const next of headers) {
      if (next === header) continue
      const idx = summary.indexOf(next, start + header.length)
      if (idx !== -1 && idx < end) end = idx
    }
    const body = summary.slice(start + header.length, end).trim()
    if (body) out[keys[i]] = body
  }
  if (Object.keys(out).length === 0 && summary.trim()) {
    out.sky = summary.trim()
  }
  return out
}
