/**
 * jupiter-season-synthesis.ts
 *
 * One Haiku call that turns Jupiter's current sign position + active natal
 * aspects into a 3–5 sentence "season" read — answering "what chapter am
 * I in right now, and what does it want from me?"
 *
 * Jupiter stays in a sign for ~12–13 months, so this is the natural
 * astrological season. Cached on user_settings keyed by signature
 * "jupiter:{sign}:{year}" — only re-generates when Jupiter changes sign
 * or the calendar year rolls over.
 */

import 'server-only'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import { recordUsage } from './usage'
import type { JupiterAspect, JupiterSeasonHDContext } from '@/lib/today/get-jupiter-season'
import type { ZodiacSign } from '@/types/blueprint'

const MODEL_ID = 'claude-haiku-4.5'
const MAX_OUTPUT_TOKENS = 280

export interface JupiterSeasonSynthesisInput {
  sign: ZodiacSign
  degreeInSign: number
  isRetrograde: boolean
  activeAspects: JupiterAspect[]
  hd: JupiterSeasonHDContext | null
}

const SYSTEM_PROMPT = [
  'You are writing the "season" read on a personal astrology planner.',
  'Jupiter has been the planet of seasons and abundance in every tradition.',
  'Its sign placement sets the flavour of the current 12-month chapter.',
  '',
  'Hard rules — do not break these:',
  '- Output 3–5 sentences of flowing prose. No headers, no lists, no greeting.',
  '- Name the season by its Jupiter sign in plain English: "Jupiter in Gemini",',
  '  "Jupiter in Cancer", etc. Open with this so the user immediately knows',
  '  what season they are in.',
  '- If Jupiter is retrograde, note briefly that this is a time of inner',
  '  digestion of the sign\'s themes rather than outward expansion.',
  '- If there are active natal aspects, weave 1–2 of the closest ones into',
  '  the read to make it personal. Name the planets. Do not list every aspect.',
  '- Stick to what Jupiter in this sign actually means — growth, philosophy,',
  '  opportunity, expansion. Do not wander into other planetary themes.',
  '- Anti-hustle voice: warm, grounded, spacious. No "manifest", no "level up",',
  '  no fortune-cookie copy. Rest is strategy, not failure.',
  '- Human Design is a lens, not a verdict. If included, weave the Type in as',
  '  framing ("as a Generator, this season…"), not as a label.',
  '- Do NOT call this an "era" or "arc" — those words belong to the outer',
  '  planets. Call this a "season" or "chapter".',
].join('\n')

function buildUserPrompt(input: JupiterSeasonSynthesisInput): string {
  const { sign, degreeInSign, isRetrograde, activeAspects, hd } = input
  const retroStr = isRetrograde ? ' (currently retrograde — inner review phase)' : ''
  const degStr = `${Math.floor(degreeInSign)}° ${sign}`

  const lines: string[] = [
    `Jupiter is at ${degStr}${retroStr}.`,
  ]

  if (activeAspects.length > 0) {
    lines.push('', 'Active Jupiter natal aspects (tightest first):')
    for (const a of activeAspects.slice(0, 3)) {
      lines.push(`- ${a.technical} (orb ${a.orb.toFixed(1)}°, ${a.applying ? 'applying' : 'separating'})`)
    }
  } else {
    lines.push('', 'No tight natal aspects from Jupiter today — the season theme is general, not personally activated right now.')
  }

  if (hd) {
    lines.push(
      '',
      `Human Design (a lens, not a verdict): ${hd.type}, ${hd.authority} authority, ${hd.profile} profile (${hd.profileName}).`,
    )
  }

  lines.push('', 'Write the 3–5 sentence Jupiter season read now.')

  return lines.join('\n')
}

export async function synthesizeJupiterSeason(opts: {
  userProfileId: string
  input: JupiterSeasonSynthesisInput
}): Promise<string> {
  const { userProfileId, input } = opts

  const { text, usage, providerMetadata } = await generateText({
    model: anthropic(MODEL_ID),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.6,
    abortSignal: AbortSignal.timeout(45_000),
  })

  const out = text.trim()
  if (!out) throw new Error('Empty Jupiter season read returned from model')

  const anthropicMeta = providerMetadata?.anthropic as
    | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
    | undefined

  recordUsage({
    userId: userProfileId,
    feature: 'jupiter_season_read',
    model: MODEL_ID,
    messages: 1,
    inputTokens: usage.inputTokens ?? 0,
    inputTokensCached: anthropicMeta?.cacheReadInputTokens ?? 0,
    cacheCreationTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  }).catch(() => undefined)

  return out
}
