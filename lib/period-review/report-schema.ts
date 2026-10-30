import { z } from 'zod'
import type { PeriodReviewSourceBundle } from './load-sources'

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
}

function chip(label: string, count: number): string | null {
  if (count <= 0) return null
  return label.replace('{n}', String(count))
}

export function buildSourceChips(sources: PeriodReviewSourceBundle): PeriodReviewSourceChips {
  const retrogrades = sources.sky.retrogradePeriods.length
  const lunations = sources.sky.moonPhases.length
  const transits = sources.sky.significantTransits.length

  const sky = [
    chip('{n} retrogrades', retrogrades),
    chip('{n} lunations', lunations),
    chip('{n} transits', transits),
  ].filter((c): c is string => Boolean(c))

  const tasksDone = sources.planTasksCompleted.length
  const tasksOpen = sources.planTasksOpen.length
  const plans = [
    chip('{n} tasks done', tasksDone),
    tasksOpen > 0 ? chip('{n} still open', tasksOpen) : null,
    chip('{n} check-in days', sources.dailyLogDays),
    sources.goalsCompletedInPeriod > 0 ? chip('{n} goals completed', sources.goalsCompletedInPeriod) : null,
  ].filter((c): c is string => Boolean(c))

  const journal =
    sources.journalEntryCount > 0 ? [chip('{n} entries', sources.journalEntryCount)].filter(Boolean) as string[] : []

  return { sky, plans, journal }
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
