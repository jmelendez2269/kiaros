import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { buildPlanImportSystemPrompt } from './plan-import-system-prompt'

const planImportSchema = z.object({
  planTitle: z.string().min(1).max(140).optional(),
  items: z
    .array(
      z.object({
        dayOffset: z.number().int().min(0).max(365),
        title: z.string().min(1).max(200),
      })
    )
    .max(120),
  warning: z.string().max(400).optional(),
})

export type PlanImportResult = z.infer<typeof planImportSchema>

export async function parsePlanFromText(sourceText: string): Promise<PlanImportResult> {
  const model = anthropic('claude-sonnet-4-6')

  const { text } = await generateText({
    model,
    system: buildPlanImportSystemPrompt(),
    prompt: `Here is the raw plan text:\n"""\n${sourceText}\n"""`,
    maxOutputTokens: 4000,
    temperature: 0.2,
    abortSignal: AbortSignal.timeout(50_000),
  })

  const jsonStr = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let raw: unknown
  try {
    raw = JSON.parse(jsonStr)
  } catch {
    throw new Error('Could not read a plan out of that input — try pasting cleaner text.')
  }

  return planImportSchema.parse(raw)
}
