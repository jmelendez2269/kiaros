import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import { z } from 'zod'
import type { CurriculumDraft } from '@/types/curriculum'
import { BRAND } from '@/lib/brand'

const sessionSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(400),
  type: z.enum(['lesson', 'practice', 'review', 'project']),
  minutes: z.number().int().min(15).max(480),
})

const weekSchema = z.object({
  weekNumber: z.number().int().min(1).max(52),
  theme: z.string().min(3).max(120),
  goal: z.string().min(10).max(240),
  deliverable: z.string().min(5).max(240),
  sessions: z.array(sessionSchema).min(1).max(7),
})

const curriculumSchema = z.object({
  title: z.string().min(3).max(140),
  topic: z.string().min(2).max(140),
  summary: z.string().min(30).max(1200),
  durationWeeks: z.number().int().min(1).max(52),
  weeklyHours: z.number().int().min(1).max(40),
  intensity: z.enum(['light', 'balanced', 'dense']),
  objectives: z.array(z.string().min(3).max(160)).min(3).max(8),
  outcomes: z.array(z.string().min(3).max(160)).min(3).max(8),
  skills: z.array(z.string().min(2).max(120)).min(3).max(12),
  weeks: z.array(weekSchema).min(1).max(52),
})

export interface GenerateCurriculumInput {
  prompt: string
  targetWeeks?: number | null
  studyFocus?: string | null
  displayName?: string | null
}

function buildSystemPrompt() {
  return [
    `You are ${BRAND.product}, an expert curriculum designer.`,
    'Read the learner\'s prompt carefully.',
    'Determine the best duration (in weeks) and intensity (light/balanced/dense) from context clues: deadlines, scope, experience level, gear complexity.',
    'If targetWeeks is specified, use that exact number of weeks.',
    'Create practical self-study curricula that feel motivating, realistic, and progressive.',
    'Return only valid JSON with no markdown fences or extra commentary.',
    'Design for an independent learner, not a university registrar.',
    'Each week must have a clear theme, one concrete goal, one deliverable, and a small set of sessions.',
    'Session types must be one of: lesson, practice, review, project.',
    'Minutes must be realistic and proportional to the chosen density.',
    'Avoid filler, repeated weeks, vague advice, or impossible pacing.',
    'When the prompt describes specific tools or gear, weave them into sessions — do not treat them as optional extras.',
  ].join(' ')
}

function buildUserPrompt(input: GenerateCurriculumInput) {
  const durationLine = input.targetWeeks
    ? `Target duration: Exactly ${input.targetWeeks} weeks. Your weeks array must have exactly ${input.targetWeeks} entries.`
    : 'Duration: Determine the best number of weeks from the learner\'s context (deadlines, depth, scope). Typical range: 4–24 weeks.'

  return `
Learner: ${input.displayName || 'Learner'}
${input.studyFocus ? `Study focus context: ${input.studyFocus}` : ''}

Learner's prompt:
"""
${input.prompt}
"""

${durationLine}

Return JSON with exactly this shape:
{
  "title": string,
  "topic": string,
  "summary": string,
  "durationWeeks": number,
  "weeklyHours": number,
  "intensity": "light" | "balanced" | "dense",
  "objectives": string[],
  "outcomes": string[],
  "skills": string[],
  "weeks": [
    {
      "weekNumber": number,
      "theme": string,
      "goal": string,
      "deliverable": string,
      "sessions": [
        {
          "title": string,
          "description": string,
          "type": "lesson" | "practice" | "review" | "project",
          "minutes": number
        }
      ]
    }
  ]
}

Rules:
- Infer topic and title from the learner's prompt.
- summary: 2–4 sentences, under 500 characters.
- intensity: light = 2–4h/wk, balanced = 4–6h/wk, dense = 6–9h/wk.
- The weeks array length must equal durationWeeks.
- Include progressive layering from foundations to synthesis.
- Include review and project moments, not just passive study.
- Titles must be clear enough to show in a planner.
`.trim()
}

function clampText(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

export async function generateCurriculumDraft(input: GenerateCurriculumInput): Promise<CurriculumDraft> {
  const model = anthropic('claude-sonnet-4-6')

  const { text } = await generateText({
    model,
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(input),
    maxOutputTokens: 12000,
    temperature: 0.7,
    abortSignal: AbortSignal.timeout(170_000),
  })

  const jsonStr = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  const parsed = curriculumSchema.parse(JSON.parse(jsonStr))

  parsed.summary = clampText(parsed.summary, 600)

  if (parsed.weeks.length !== parsed.durationWeeks) {
    throw new Error(`Curriculum returned ${parsed.weeks.length} weeks but durationWeeks says ${parsed.durationWeeks}.`)
  }

  if (input.targetWeeks && parsed.durationWeeks !== input.targetWeeks) {
    throw new Error(`Curriculum returned ${parsed.durationWeeks} weeks instead of requested ${input.targetWeeks}.`)
  }

  return parsed
}
