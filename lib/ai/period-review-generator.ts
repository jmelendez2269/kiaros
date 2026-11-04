import 'server-only'

import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import {
  assemblePeriodReviewSystemPrompt,
  assemblePeriodReviewUserPrompt,
  type LookBackPromptOptions,
} from './period-review-system-prompt'
import { loadPeriodReviewSources, type PeriodReviewSourceBundle } from '@/lib/period-review/load-sources'
import type { PeriodReviewPeriod } from '@/lib/period-review/periods'
import {
  buildSourceChips,
  flattenPeriodReviewSections,
  periodReviewSectionsSchema,
  type PeriodReviewSections,
  type PeriodReviewSourceChips,
} from '@/lib/period-review/report-schema'
import { sanitizePeriodReviewOutput } from '@/lib/period-review/sanitize-output'
import { checkQuestionToCarry } from '@/lib/period-review/question-anchor'
import { recordUsage } from './usage'

const MODEL_ID = 'claude-sonnet-4-6'
const MAX_OUTPUT_TOKENS = 1200

export function periodReviewModel() {
  return anthropic(MODEL_ID)
}

function sanitizeSections(raw: PeriodReviewSections, includeJournal: boolean): PeriodReviewSections {
  const out: PeriodReviewSections = {}
  if (raw.thread?.trim()) out.thread = sanitizePeriodReviewOutput(raw.thread)
  if (raw.sky?.trim()) out.sky = sanitizePeriodReviewOutput(raw.sky)
  if (raw.plansAndGoals?.trim()) out.plansAndGoals = sanitizePeriodReviewOutput(raw.plansAndGoals)
  if (includeJournal && raw.inYourWords?.trim()) out.inYourWords = sanitizePeriodReviewOutput(raw.inYourWords)
  if (raw.questionToCarry?.trim()) out.questionToCarry = sanitizePeriodReviewOutput(raw.questionToCarry)
  return out
}

export type GeneratedLookBack = {
  summary: string
  sections: PeriodReviewSections
  sourceChips: PeriodReviewSourceChips
  model: string
}

export async function generatePeriodReviewSummary(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<GeneratedLookBack> {
  const sources = await loadPeriodReviewSources(userId, period)
  return generateLookBackFromSources(userId, sources)
}

/**
 * Shared core for month/quarter reviews and sky cycle look backs: same voice,
 * output schema, sanitising, question check and usage accounting (one shared
 * daily cap under the 'period_review' feature).
 */
export async function generateLookBackFromSources(
  userId: string,
  sources: PeriodReviewSourceBundle,
  promptOptions: LookBackPromptOptions = {},
  systemAddendum = '',
): Promise<GeneratedLookBack> {
  const includeJournal = sources.journalEntryCount + (sources.captureCount ?? 0) > 0

  const { output, usage } = await generateText({
    model: periodReviewModel(),
    output: Output.object({ schema: periodReviewSectionsSchema }),
    system: `${assemblePeriodReviewSystemPrompt()}${systemAddendum ? `\n\n${systemAddendum}` : ''}

Return JSON only with optional string fields: thread, sky, plansAndGoals, questionToCarry. Omit empty sections.`,
    prompt: assemblePeriodReviewUserPrompt(sources, promptOptions),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.72,
    abortSignal: AbortSignal.timeout(90_000),
  })

  const sections = sanitizeSections(output, includeJournal)
  if (sections.questionToCarry) {
    const check = checkQuestionToCarry(sections.questionToCarry, sources)
    if (!check.ok) {
      // A generic or predictive question is dropped rather than shown. Log outcome only.
      console.info(JSON.stringify({ event: 'period_review_question', outcome: 'dropped', reason: check.reason }))
      delete sections.questionToCarry
    }
  }
  if (!sections.thread && !sections.sky && !sections.plansAndGoals && !sections.questionToCarry) {
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
