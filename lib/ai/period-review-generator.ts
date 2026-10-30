import 'server-only'

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import {
  assemblePeriodReviewSystemPrompt,
  assemblePeriodReviewUserPrompt,
} from './period-review-system-prompt'
import { loadPeriodReviewSources } from '@/lib/period-review/load-sources'
import type { PeriodReviewPeriod } from '@/lib/period-review/periods'
import { recordUsage } from './usage'

const MODEL_ID = 'claude-sonnet-4-6'
const MAX_OUTPUT_TOKENS = 700

export function periodReviewModel() {
  return anthropic(MODEL_ID)
}

export async function generatePeriodReviewSummary(
  userId: string,
  period: PeriodReviewPeriod,
): Promise<{ summary: string; model: string }> {
  const sources = await loadPeriodReviewSources(userId, period)
  const { text, usage } = await generateText({
    model: periodReviewModel(),
    system: assemblePeriodReviewSystemPrompt(),
    prompt: assemblePeriodReviewUserPrompt(sources),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.72,
    abortSignal: AbortSignal.timeout(90_000),
  })

  const summary = text.trim().replace(/&/g, 'and')
  if (!summary) throw new Error('Empty period review returned from model')

  await recordUsage({
    userId,
    feature: 'period_review',
    model: MODEL_ID,
    messages: 1,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  })

  return { summary, model: MODEL_ID }
}
