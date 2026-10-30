import 'server-only'

import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import {
  assemblePeriodReviewSystemPrompt,
  assemblePeriodReviewUserPrompt,
} from './period-review-system-prompt'
import { loadPeriodReviewSources } from '@/lib/period-review/load-sources'
import type { PeriodReviewPeriod } from '@/lib/period-review/periods'
import {
  buildSourceChips,
  flattenPeriodReviewSections,
  periodReviewSectionsSchema,
  type PeriodReviewSections,
  type PeriodReviewSourceChips,
} from '@/lib/period-review/report-schema'
import { sanitizePeriodReviewOutput } from '@/lib/period-review/sanitize-output'
import { recordUsage } from './usage'

const MODEL_ID = 'claude-sonnet-4-6'
const MAX_OUTPUT_TOKENS = 900

export function periodReviewModel() {
  return anthropic(MODEL_ID)
}

function sanitizeSections(raw: PeriodReviewSections, includeJournal: boolean): PeriodReviewSections {
  const out: PeriodReviewSections = {}
  if (raw.sky?.trim()) out.sky = sanitizePeriodReviewOutput(raw.sky)
  if (raw.plansAndGoals?.trim()) out.plansAndGoals = sanitizePeriodReviewOutput(raw.plansAndGoals)
  if (includeJournal && raw.inYourWords?.trim()) out.inYourWords = sanitizePeriodReviewOutput(raw.inYourWords)
  if (raw.questionToCarry?.trim()) out.questionToCarry = sanitizePeriodReviewOutput(raw.questionToCarry)
  return out
}

export async function generatePeriodReviewSummary(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<{
  summary: string
  sections: PeriodReviewSections
  sourceChips: PeriodReviewSourceChips
  model: string
}> {
  const sources = await loadPeriodReviewSources(userId, period)
  const includeJournal = sources.journalEntryCount > 0

  const { output, usage } = await generateText({
    model: periodReviewModel(),
    output: Output.object({ schema: periodReviewSectionsSchema }),
    system: `${assemblePeriodReviewSystemPrompt()}

Return JSON only with optional string fields: sky, plansAndGoals, inYourWords, questionToCarry. Omit empty sections.`,
    prompt: assemblePeriodReviewUserPrompt(sources),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.72,
    abortSignal: AbortSignal.timeout(90_000),
  })

  const sections = sanitizeSections(output, includeJournal)
  if (!sections.sky && !sections.plansAndGoals && !sections.questionToCarry) {
    throw new Error('Empty period review returned from model')
  }

  const sourceChips = buildSourceChips(sources)
  const summary = flattenPeriodReviewSections(sections)

  await recordUsage({
    userId,
    feature: 'period_review',
    model: MODEL_ID,
    messages: 1,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  })

  return { summary, sections, sourceChips, model: MODEL_ID }
}
