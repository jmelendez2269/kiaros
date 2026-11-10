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
import { chipReturningPattern, chipReturningTheme } from './returning-threads'

export const periodReviewSectionsSchema = z.object({
  /** What the period was about: the thread across entries, check-ins, plans and sky. */
  thread: z.string().min(1).optional(),
  sky: z.string().min(1).optional(),
  plansAndGoals: z.string().min(1).optional(),
  /** Saved reviews from before 2026-11 only; new look backs weave the member's words into thread. */
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
  /** Skies overhead in the period that the member has written under before (see Patterns). Absent before 2026-11. */
  patterns?: string[]
  /** Themes in the period's saved conversations that have come up before (see Mind map). Absent before 2026-11. */
  themes?: string[]
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

  const patterns = (sources.returning?.patterns ?? []).map(chipReturningPattern)
  const themes = (sources.returning?.themes ?? []).map(chipReturningTheme)

  return { sky, plans, journal, personal, patterns, themes }
}

export function flattenPeriodReviewSections(sections: PeriodReviewSections): string {
  const parts: string[] = []
  if (sections.thread?.trim()) parts.push(`What it was about\n\n${sections.thread.trim()}`)
  if (sections.sky?.trim()) parts.push(`${sections.thread?.trim() ? 'How the sky sat with it' : 'The sky'}\n\n${sections.sky.trim()}`)
  if (sections.plansAndGoals?.trim()) parts.push(`Your plans and goals\n\n${sections.plansAndGoals.trim()}`)
  if (sections.inYourWords?.trim()) parts.push(`In your words\n\n${sections.inYourWords.trim()}`)
  if (sections.questionToCarry?.trim()) parts.push(`A question to carry\n\n${sections.questionToCarry.trim()}`)
  return parts.join('\n\n')
}

export function parseLegacySummarySections(summary: string): PeriodReviewSections {
  const headers = ['What it was about', 'How the sky sat with it', 'The sky', 'Your plans and goals', 'In your words', 'A question to carry'] as const
  const keys: (keyof PeriodReviewSections)[] = ['thread', 'sky', 'sky', 'plansAndGoals', 'inYourWords', 'questionToCarry']
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
