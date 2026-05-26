/**
 * season-synthesis.ts
 *
 * One Haiku call that turns the deterministic "season" data (active
 * heavy transit windows + Human Design + Gene Keys) into a 3–5
 * sentence read for the top of /today. It answers the question the
 * per-day surfaces can't: "what season am I in, and what does it mean
 * that several once-in-a-lifetime transits are active at once?"
 *
 * Cost control lives in the caller: the read is cached on
 * user_settings keyed by the heavy-window signature, so this only
 * fires when a rare/once-in-a-lifetime window opens or closes — not
 * per page load. See lib/today/get-season.ts.
 *
 * Voice rule (feedback_hd_voice + PRODUCT_BIBLE tone): HD and Gene
 * Keys are tools the user thinks with, never authorities. Name the
 * season, honour the rarity, stay anti-hustle. No fortune-cookie.
 */

import 'server-only'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { gateway } from '@ai-sdk/gateway'
import { recordUsage } from './usage'
import type { SeasonHeavyWindow, SeasonHDContext } from '@/lib/today/get-season'

const MODEL_ID = 'claude-haiku-4-5'
const MAX_OUTPUT_TOKENS = 320

export interface SeasonSynthesisInput {
  onceInLifetimeCount: number
  rareCount: number
  heavy: SeasonHeavyWindow[]
  hd: SeasonHDContext | null
}

function buildModel() {
  return process.env.VERCEL ? gateway(`anthropic/${MODEL_ID}`) : anthropic(MODEL_ID)
}

const SYSTEM_PROMPT = [
  'You are writing the "season" read at the top of a personal astrology planner.',
  'It sits above the daily surfaces and answers a bigger question: what slow',
  'season is this person living through, and why does it matter that several of',
  "the sky's rarest transits are touching their chart at once?",
  '',
  'Hard rules — do not break these:',
  '- Output 3–5 sentences of flowing prose. No headers, no lists, no greeting.',
  '- Name the season in plain language a beginner understands.',
  '- Honour the rarity honestly: the outer planets (Uranus, Neptune, Pluto) cross',
  '  any given point in a chart once and do not return within a human lifetime,',
  '  and Saturn returns only about every 29 years. If several are active together,',
  '  say plainly that this exact configuration will not recur for them — that is',
  '  the whole point, and the user is right to find it striking.',
  '- Ground every claim in the actual transits, Type, and Gene Keys provided.',
  '  Never invent placements. Refer to the real planets and natal points by name.',
  '- Human Design and Gene Keys are tools the user thinks with, not authorities.',
  '  Weave the Type and at most one Gene Key in as framing ("as a <Type>, …"),',
  '  never as a verdict, and never claim certainty about who they are.',
  '- Anti-hustle voice: rest is strategy, not failure. Warm, grounded,',
  '  mystical-but-practical. Spacious, not breathless. No "level up", no',
  '  "harness this energy", no fortune-cookie astrology.',
  '- Do not give daily instructions or a to-do list. This is the long view.',
].join('\n')

function describeWindow(w: SeasonHeavyWindow): string {
  const ends =
    w.daysFromTodayToEnd > 400
      ? 'still has well over a year to run'
      : w.daysFromTodayToEnd > 60
        ? `runs about ${Math.round(w.daysFromTodayToEnd / 30)} more month(s)`
        : `is in its closing weeks`
  return `- ${w.technical} — ${w.rarityLabel.toLowerCase()} (${w.periodLabel}); ${ends}.`
}

function buildUserPrompt(input: SeasonSynthesisInput): string {
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
      '(No reliable Human Design available — write from the transits alone; do not mention HD or Gene Keys.)',
    )
  }

  lines.push(
    '',
    'Write the 3–5 sentence season read now. Make the rarity land: this person',
    'is right to wonder what it means to have several once-in-a-lifetime currents',
    'at the same time.',
  )

  return lines.join('\n')
}

export async function synthesizeSeason(opts: {
  userProfileId: string
  input: SeasonSynthesisInput
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
  if (!out) throw new Error('Empty season read returned from model')

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
