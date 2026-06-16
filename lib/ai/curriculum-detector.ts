import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const detectionSchema = z.discriminatedUnion('split', [
  z.object({ split: z.literal(false) }),
  z.object({
    split: z.literal(true),
    courses: z.array(
      z.object({
        label: z.string().min(3).max(100),
        prompt: z.string().min(20).max(2000),
      })
    ).min(2).max(4),
  }),
])

export type DetectionResult = z.infer<typeof detectionSchema>

export async function detectCurriculumSplit(prompt: string): Promise<DetectionResult> {
  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: [
      'You analyze learning prompts and decide whether they describe multiple distinct courses.',
      'Split when the prompt contains 2+ clearly separate skill domains, tools, or goals that need different sessions, pacing, and outcomes.',
      'Do NOT split when topics naturally layer into one cohesive journey.',
      'Return only valid JSON — no markdown fences, no commentary.',
    ].join(' '),
    prompt: `Does this prompt describe multiple distinct courses that would be better generated separately?

"""
${prompt}
"""

If yes, rewrite each as a focused standalone prompt, preserving all relevant detail from the original (gear, experience level, deadline, inspirations).

Return:
{"split": false}
OR
{"split": true, "courses": [{"label": "Short course title", "prompt": "Full focused prompt for this course"}, ...]}`,
    maxOutputTokens: 1200,
    temperature: 0.2,
    abortSignal: AbortSignal.timeout(20_000),
  })

  const jsonStr = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  return detectionSchema.parse(JSON.parse(jsonStr))
}
