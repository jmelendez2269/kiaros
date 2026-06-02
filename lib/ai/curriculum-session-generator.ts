import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import { z } from 'zod'
import type {
  CurriculumDraftSession,
  CurriculumDraftWeek,
  CurriculumSessionContent,
  CurriculumSessionType,
} from '@/types/curriculum'

export const CURRICULUM_SESSION_MODEL = 'claude-haiku-4-5-20251001'

const exerciseSchema = z.object({
  prompt: z.string().min(4).max(280),
  detail: z.string().max(500).optional(),
})

const sessionContentSchema = z.object({
  body: z.string().min(120).max(6000),
  exercises: z.array(exerciseSchema).min(1).max(4),
  reflectionPrompt: z.string().min(8).max(280),
})

interface GenerateSessionInput {
  planTitle: string
  planTopic: string
  planSummary: string | null
  week: Pick<CurriculumDraftWeek, 'weekNumber' | 'theme' | 'goal' | 'deliverable'>
  session: CurriculumDraftSession
  displayName?: string | null
  studyFocus?: string | null
}

export interface GeneratedSessionContent extends CurriculumSessionContent {
  inputTokens: number
  outputTokens: number
  model: string
}

function typeGuidance(type: CurriculumSessionType): string {
  if (type === 'lesson') {
    return 'Treat this as a teaching session: explain the underlying concepts, use one or two concrete examples, and connect to the week\'s goal. Avoid vague generalities.'
  }
  if (type === 'practice') {
    return 'Treat this as a working session: short setup, then a clear hands-on activity with concrete steps the learner can follow without you.'
  }
  if (type === 'review') {
    return 'Treat this as a consolidation session: revisit what was covered, surface gaps, and give a focused way to self-check understanding.'
  }
  return 'Treat this as a project session: scope a small deliverable the learner can complete this session, with checkpoints.'
}

function buildSystemPrompt() {
  return [
    'You are Kiaros, an expert tutor writing a single self-study lesson.',
    'Tone: warm, grounded, practical. Not hustle. Not fortune-cookie astrology.',
    'Output only valid JSON, no markdown fences, no commentary.',
    'The "body" field is markdown allowed (headings, lists, inline code, blockquotes). Keep it tight — a learner should read it in roughly the session length.',
    'Reference the week\'s theme and goal so the session feels part of a sequence, not isolated.',
    'Never invent prerequisite knowledge; if something needs grounding, give it in one or two sentences.',
  ].join(' ')
}

function buildUserPrompt(input: GenerateSessionInput) {
  return `
Write the lesson content for one session inside a self-study curriculum.

CURRICULUM
- Title: ${input.planTitle}
- Topic: ${input.planTopic}
- Summary: ${input.planSummary || '—'}
- Learner: ${input.displayName || 'Learner'}
- Existing study focus: ${input.studyFocus || '—'}

WEEK ${input.week.weekNumber}
- Theme: ${input.week.theme}
- Weekly goal: ${input.week.goal}
- Weekly deliverable: ${input.week.deliverable}

THIS SESSION
- Title: ${input.session.title}
- Type: ${input.session.type}
- Length: ${input.session.minutes} minutes
- Brief: ${input.session.description}

${typeGuidance(input.session.type)}

Return JSON with exactly this shape:
{
  "body": string,
  "exercises": [
    { "prompt": string, "detail": string }
  ],
  "reflectionPrompt": string
}

Rules:
- "body" is the main lesson text in markdown. Aim for content that fits the ${input.session.minutes}-minute slot — longer for lessons, more compact for review.
- 1–3 "exercises". Each "prompt" is a short imperative line ("Sketch a I-V-vi-IV progression in C…"). "detail" is optional 1–2 sentences of guidance.
- "reflectionPrompt" is one open question the learner can answer in their journal afterwards.
- Do not output any text outside the JSON object.
`.trim()
}

export async function generateCurriculumSessionContent(
  input: GenerateSessionInput
): Promise<GeneratedSessionContent> {
  const model = anthropic(CURRICULUM_SESSION_MODEL)

  const result = await generateText({
    model,
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(input),
    maxOutputTokens: 4000,
    temperature: 0.6,
    abortSignal: AbortSignal.timeout(110_000),
  })

  const jsonStr = result.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  const parsed = sessionContentSchema.parse(JSON.parse(jsonStr))

  return {
    body: parsed.body,
    exercises: parsed.exercises.map((e) => ({
      prompt: e.prompt,
      detail: e.detail ?? null,
    })),
    reflectionPrompt: parsed.reflectionPrompt,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    model: CURRICULUM_SESSION_MODEL,
  }
}
