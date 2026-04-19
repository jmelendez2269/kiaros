import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { gateway } from '@ai-sdk/gateway'
import { z } from 'zod'
import type { CurriculumDraft, CurriculumIntensity } from '@/types/curriculum'

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

interface GenerateCurriculumInput {
  topic: string
  durationWeeks: number
  intensity: CurriculumIntensity
  skills: string[]
  goals?: string | null
  constraints?: string | null
  studyFocus?: string | null
  displayName?: string | null
}

function buildSystemPrompt() {
  return [
    'You are Kiaros, an expert curriculum designer.',
    'Create practical self-study curricula that feel motivating, realistic, and progressive.',
    'Return only valid JSON with no markdown fences or extra commentary.',
    'Design for an independent learner, not a university registrar.',
    'Each week must have a clear theme, one concrete goal, one deliverable, and a small set of sessions.',
    'Session types must be one of: lesson, practice, review, project.',
    'Minutes must be realistic and proportional to the requested density.',
    'Avoid filler, repeated weeks, vague advice, or impossible pacing.',
  ].join(' ')
}

function buildUserPrompt(input: GenerateCurriculumInput) {
  const skillsLine = input.skills.length > 0 ? input.skills.join(', ') : 'No explicit skills supplied.'

  return `
Create a self-study curriculum in JSON for this learner:
- Learner name: ${input.displayName || 'Learner'}
- Topic: ${input.topic}
- Duration: ${input.durationWeeks} weeks
- Density: ${input.intensity}
- Skills or outcomes requested: ${skillsLine}
- Extra goals: ${input.goals || 'None provided'}
- Constraints or preferences: ${input.constraints || 'None provided'}
- Existing study focus context: ${input.studyFocus || 'None provided'}

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
- The number of weeks must equal ${input.durationWeeks}.
- Keep total effort aligned with "${input.intensity}".
- Keep the summary to 2-4 sentences and under 500 characters.
- Light usually means 2-4 hours per week.
- Balanced usually means 4-6 hours per week.
- Dense usually means 6-9 hours per week.
- Include progressive layering from foundations to synthesis.
- Include review and project moments, not just passive study.
- Make the titles clear enough to show in a planner.
`.trim()
}

function clampText(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

export async function generateCurriculumDraft(input: GenerateCurriculumInput): Promise<CurriculumDraft> {
  const model = process.env.VERCEL
    ? gateway('anthropic/claude-sonnet-4-6')
    : anthropic('claude-sonnet-4-6')

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

  if (parsed.weeks.length !== input.durationWeeks) {
    throw new Error(`Curriculum returned ${parsed.weeks.length} weeks instead of ${input.durationWeeks}.`)
  }

  return parsed
}
