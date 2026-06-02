/**
 * capture-topic-extractor.ts
 *
 * Background tagging for Oracle captures. Given a saved capture (and the
 * user's preceding prompt when it's an exchange), extract structured tags
 * along five axes so the captures can be plotted in the mind-map graph and
 * later fed back into Stelloquy's prompt as longitudinal context.
 *
 * Voice rule: tags are observations the user produced, not interpretations.
 * Haiku is instructed to extract only what is actually named or strongly
 * implied — no astrology padding, no HD jargon the conversation did not use.
 */

import 'server-only'
import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import { z } from 'zod'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { recordUsage } from './usage'

const MODEL_ID = 'claude-haiku-4-5'
const MAX_OUTPUT_TOKENS = 600

const tagItemSchema = z.object({
  label: z.string().trim().min(1).max(120),
  confidence: z.number().min(0).max(1),
})

const extractionSchema = z.object({
  themes: z.array(tagItemSchema).max(8),
  natal_aspects: z.array(tagItemSchema).max(6),
  transit_aspects: z.array(tagItemSchema).max(6),
  hd_elements: z.array(tagItemSchema).max(6),
  moods: z.array(tagItemSchema).max(4),
})

export type CaptureExtraction = z.infer<typeof extractionSchema>

const SYSTEM_INSTRUCTIONS = `You extract structured tags from a saved Kiaros conversation moment so the user can see longitudinal patterns in their own data. Tag only what is explicitly named or strongly implied in the source text. Do not add astrology or Human Design content the conversation did not use.

Five axes:

1. themes — short, lowercase, hyphenated noun phrases naming the lived topic. Examples: "career-transition", "rest-as-failure", "relocation-to-miami", "creative-inhibition", "addiction-pattern", "environmental-absorption", "surrender-vs-control". 1–5 words. Up to 8.

2. natal_aspects — aspects between the user's natal planets ONLY. Canonical format: "Planet1 aspect Planet2" (e.g. "Saturn square Uranus", "Mars conjunct Jupiter"). Use lowercase aspect names. Only include if the source text actually named the aspect. Up to 6.

3. transit_aspects — aspects from a transiting planet to a natal planet. Canonical format: "transiting Planet aspect natal Planet" (e.g. "transiting Saturn square natal Uranus"). Up to 6.

4. hd_elements — Human Design elements the source text used. Canonical formats: "Reflector", "Manifestor", "Generator", "Manifesting Generator", "Projector" for Type; "undefined Spleen", "undefined Solar Plexus", "defined G center" etc. for centers; "1/3 profile", "Lunar Authority", "Splenic Authority" etc. for profile/authority. Up to 6.

5. moods — one or two words naming the emotional valence the user expressed (not Stelloquy's interpretation). Examples: "depressed", "out-of-sorts", "frustrated", "tentatively-hopeful", "stuck". Up to 4.

Confidence is 0.0–1.0:
- 1.0 = directly named in the source text
- 0.7–0.9 = strongly implied
- below 0.7 = skip the tag entirely

Return only what fits. If an axis has no good tags, return an empty array for it.`

function buildUserPrompt(prompt: string | null, reply: string): string {
  const sections: string[] = []
  if (prompt && prompt.trim()) {
    sections.push(`USER PROMPT:\n${prompt.trim()}`)
  }
  sections.push(`ASSISTANT REPLY:\n${reply.trim()}`)
  return sections.join('\n\n')
}

/**
 * End-to-end: run extraction for a capture and write its tags. Designed
 * to be called from a Next 15 `after()` callback so it never blocks the
 * capture POST response.
 */
export async function tagCaptureInBackground(params: {
  userProfileId: string
  captureId: string
  capturedText: string
  precedingPrompt: string | null
}): Promise<void> {
  const model = anthropic(MODEL_ID)

  let extraction: CaptureExtraction | null = null
  let inputTokens = 0
  let outputTokens = 0

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: extractionSchema }),
      system: SYSTEM_INSTRUCTIONS,
      prompt: buildUserPrompt(params.precedingPrompt, params.capturedText),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    })
    extraction = result.output
    inputTokens = result.usage.inputTokens ?? 0
    outputTokens = result.usage.outputTokens ?? 0
  } catch (err) {
    console.error(`[capture-topic-extractor] capture=${params.captureId} extraction failed:`, err)
    return
  }

  if (!extraction) return

  const rows: Array<{
    capture_id: string
    user_id: string
    kind: 'theme' | 'natal_aspect' | 'transit_aspect' | 'hd_element' | 'mood'
    label: string
    confidence: number
  }> = []

  const axes: Array<[keyof CaptureExtraction, 'theme' | 'natal_aspect' | 'transit_aspect' | 'hd_element' | 'mood']> = [
    ['themes', 'theme'],
    ['natal_aspects', 'natal_aspect'],
    ['transit_aspects', 'transit_aspect'],
    ['hd_elements', 'hd_element'],
    ['moods', 'mood'],
  ]

  for (const [key, kind] of axes) {
    for (const item of extraction[key]) {
      if (item.confidence < 0.7) continue
      const label = item.label.trim()
      if (!label) continue
      rows.push({
        capture_id: params.captureId,
        user_id: params.userProfileId,
        kind,
        label: label.slice(0, 200),
        confidence: Number(item.confidence.toFixed(2)),
      })
    }
  }

  if (rows.length === 0) return

  const admin = createAdminSupabase()
  const { error } = await admin.from('capture_topics').insert(rows)
  if (error) {
    console.error(`[capture-topic-extractor] capture=${params.captureId} insert failed:`, error)
    return
  }

  await recordUsage({
    userId: params.userProfileId,
    feature: 'capture_topic_extract',
    model: MODEL_ID,
    messages: 1,
    inputTokens,
    inputTokensCached: 0,
    cacheCreationTokens: 0,
    outputTokens,
  }).catch((err) => console.error('[capture-topic-extractor] usage record failed:', err))
}
