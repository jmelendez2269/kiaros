/**
 * life-arc-synthesis.ts
 *
 * One Haiku call that turns the deterministic "life arc" data (active
 * heavy transit windows + Human Design + Gene Keys) into a 3–5 sentence
 * read. It answers: "what multi-year era am I living through?"
 *
 * Formerly synthesizeSeason — renamed because Saturn/Uranus/Neptune/Pluto
 * transits last years or decades, not seasons.
 *
 * Cached on user_settings (season_read / season_read_signature columns)
 * keyed by the heavy-window signature. Only fires when a window opens
 * or closes — not per page load.
 */

import 'server-only'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import { recordUsage } from './usage'
import type { LifeArcHeavyWindow, LifeArcHDContext } from '@/lib/today/get-life-arc'

const MODEL_ID = 'claude-haiku-4-5'
const MAX_OUTPUT_TOKENS = 320

export interface LifeArcSynthesisInput {
  onceInLifetimeCount: number
  rareCount: number
  heavy: LifeArcHeavyWindow[]
  hd: LifeArcHDContext | null
}

function buildModel() {
  return anthropic(MODEL_ID)
}

const SYSTEM_PROMPT = [
  'You are writing the "life arc" read at the top of a personal astrology planner.',
  'It answers a bigger question: what slow multi-year era is this person living',
  'through, and why does it matter that several of the sky\'s rarest transits are',
  'touching their chart at once?',
  '',
  'Hard rules — do not break these:',
  '- Output 3–5 sentences of flowing prose. No headers, no lists, no greeting.',
  '- Name the era in plain language a beginner understands.',
  '- Honour the rarity honestly: Uranus, Neptune, and Pluto cross any given point',
  '  in a chart once and do not return within a human lifetime; Saturn returns only',
  '  about every 29 years. If several are active together, say plainly that this',
  '  exact configuration will not recur for them — that is the whole point.',
  '- Ground every claim in the actual transits, Type, and Gene Keys provided.',
  '  Never invent placements. Refer to the real planets and natal points by name.',
  '- Human Design and Gene Keys are tools the user thinks with, not authorities.',
  '  Weave the Type and at most one Gene Key in as framing, never as a verdict.',
  '- Anti-hustle voice: rest is strategy, not failure. Warm, grounded,',
  '  mystical-but-practical. No "level up", no "harness this energy".',
  '- Do not give daily instructions. This is the long view — years, not days.',
  '- Do NOT call this a "season". Use "era", "arc", "chapter", or "passage".',
].join('\n')

function describeWindow(w: LifeArcHeavyWindow): string {
  const ends =
    w.daysFromTodayToEnd > 400
      ? 'still has well over a year to run'
      : w.daysFromTodayToEnd > 60
        ? `runs about ${Math.round(w.daysFromTodayToEnd / 30)} more month(s)`
        : `is in its closing weeks`
  return `- ${w.technical} — ${w.rarityLabel.toLowerCase()} (${w.periodLabel}); ${ends}.`
}

function buildUserPrompt(input: LifeArcSynthesisInput): string {
  const { onceInLifetimeCount, rareCount, heavy, hd } = input

  const counts = [
    onceInLifetimeCount > 0
      ? `${onceInLifetimeCount} once-in-a-lifetime transit window(s)`
      : null,
    rareCount > 0 ? `${rareCount} rare (Saturn-class) window(s)` : null,
  ]
    .filter(Boolean)
    .join(' and ')

  const lines: string[] = [
    `Active heavy transit windows right now (${counts}):`,
    ...heavy.map(describeWindow),
  ]

  if (hd) {
    lines.push(
      '',
      'Human Design (a lens, not a verdict):',
      `- Type: ${hd.type}; Authority: ${hd.authority}; Profile: ${hd.profile} (${hd.profileName}).`,
      'Gene Keys spine:',
      `- Life's Work: ${hd.lifesWork}`,
      `- Purpose: ${hd.purpose}`,
    )
  } else {
    lines.push(
      '',
      '(No reliable Human Design available — write from the transits alone.)',
    )
  }

  lines.push(
    '',
    'Write the 3–5 sentence life arc read now. Make the rarity land: this person',
    'is right to wonder what it means to have several once-in-a-lifetime currents',
    'active at the same time. Call this an era, arc, or chapter — not a season.',
  )

  return lines.join('\n')
}

export async function synthesizeLifeArc(opts: {
  userProfileId: string
  input: LifeArcSynthesisInput
}): Promise<string> {
  const { userProfileId, input } = opts

  const { text, usage, providerMetadata } = await generateText({
    model: buildModel(),
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.65,
    abortSignal: AbortSignal.timeout(45_000),
  })

  const out = text.trim()
  if (!out) throw new Error('Empty life arc read returned from model')

  const anthropicMeta = providerMetadata?.anthropic as
    | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
    | undefined

  recordUsage({
    userId: userProfileId,
    feature: 'season_read',
    model: MODEL_ID,
    messages: 1,
    inputTokens: usage.inputTokens ?? 0,
    inputTokensCached: anthropicMeta?.cacheReadInputTokens ?? 0,
    cacheCreationTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  }).catch(() => undefined)

  return out
}
