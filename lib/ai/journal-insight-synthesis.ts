/**
 * journal-insight-synthesis.ts
 *
 * Replaces the deterministic SQL template summary on
 * `user_pattern_insights.summary` with a real AI synthesis written
 * in the user's chosen voice. The template still ships as fallback
 * inside refresh_user_pattern_insight (0012). What we add here:
 *
 *   - synthesizeInsight(): one Haiku call for one pattern, given a
 *     voice instruction and the entries that pattern was built from
 *   - synthesizePreview(): pick the user's biggest pattern and
 *     synthesise it with the proposed voice (no DB writes; used by
 *     the voice panel's "Preview" button)
 *   - regenerateAllForUser(): batch every pattern row for a user
 *     through the synthesizer with concurrency 5
 *
 * Pattern voice + entries → 2–3 sentence observation, grounded in
 * what the user actually wrote. No fortune-cookie astrology.
 */

import 'server-only'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import { createAdminSupabase } from '@/lib/supabase/admin'
import { recordUsage } from './usage'
import type { PatternRefreshTarget } from '@/lib/journal/intelligence'
import { BRAND } from '@/lib/brand'

const MODEL_ID = 'claude-haiku-4-5'
const MAX_OUTPUT_TOKENS = 220
const BATCH_CONCURRENCY = 5
const ENTRY_BODY_EXCERPT_CHARS = 400
const ENTRIES_PER_SYNTHESIS = 6

export type PatternType = 'aspect' | 'lunar_phase' | 'lunar_sign' | 'retrograde'

export interface VoicePreset {
  label: string
  prompt: string
}

export const VOICE_PRESETS: Record<string, VoicePreset> = {
  grounded: {
    label: 'Grounded observer',
    prompt:
      'Write like a friend who has noticed something — plain, warm, never prescriptive. ' +
      'Lead with what the entries actually contain, not what the astrology "means". ' +
      'No directives ("you should…"); just observation ("you keep writing about…").',
  },
  mystic: {
    label: 'Mystic-but-practical',
    prompt:
      `Write in the ${BRAND.product} house voice: warm, grounded, mystical-but-practical, anti-hustle. ` +
      'A touch more poetic than plain prose, but always anchored to the entries themselves. ' +
      'Never fortune-cookie. Never prescriptive. Notice the rhythm; do not predict.',
  },
  clinical: {
    label: 'Clinical / data',
    prompt:
      'Write in a stripped, observational register. No astrological framing, no metaphor. ' +
      'State the pattern as evidence: count, recurring themes from the entries, range. ' +
      'No interpretation about what it "means".',
  },
}

export const DEFAULT_VOICE_KEY = 'grounded'

export function resolveVoicePrompt(voice: string | null | undefined): string {
  if (voice && voice.trim().length > 0) return voice.trim()
  return VOICE_PRESETS[DEFAULT_VOICE_KEY].prompt
}

export function patternLabel(type: PatternType, key: string): string {
  if (type === 'aspect') return key.split(':').join(' ')
  if (type === 'lunar_phase') return `${key} Moon`
  if (type === 'lunar_sign') return `Moon in ${key}`
  if (type === 'retrograde') return `${key} retrograde`
  return key
}

interface PatternEntry {
  entry_id: string
  entry_date: string
  title: string | null
  body: string
}

interface PatternInput {
  pattern_type: PatternType
  pattern_key: string
  sample_size: number
  first_seen: string | null
  last_seen: string | null
  entries: PatternEntry[]
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

function buildSystemPrompt(voicePrompt: string): string {
  return [
    'You are writing observational summaries of a user\'s journal patterns.',
    '',
    'Hard rules — do not break these:',
    '- Output 2–3 sentences. Never more.',
    '- Ground everything in the actual entries provided. If you cannot back a',
    '  claim with the entries, do not make it.',
    '- Never write prescriptive language ("you should", "try to", "consider").',
    '- Never write generic astrology fortune-cookie copy.',
    '- Never invent details that are not in the entries.',
    '- Do not greet, do not summarise the assignment, do not add headers.',
    '  Output only the observation prose.',
    '',
    'Voice for this user:',
    voicePrompt,
  ].join('\n')
}

function buildUserPrompt(pattern: PatternInput): string {
  const label = patternLabel(pattern.pattern_type, pattern.pattern_key)
  const range =
    pattern.first_seen && pattern.last_seen
      ? pattern.first_seen === pattern.last_seen
        ? pattern.first_seen
        : `${pattern.first_seen} → ${pattern.last_seen}`
      : 'no date range recorded'

  const entryBlocks = pattern.entries.length
    ? pattern.entries
        .map((entry, i) => {
          const title = entry.title?.trim() || 'Untitled entry'
          const body = truncate(entry.body.trim(), ENTRY_BODY_EXCERPT_CHARS)
          return `Entry ${i + 1} — ${entry.entry_date} — ${title}\n${body}`
        })
        .join('\n\n')
    : '(No entry bodies available.)'

  return [
    `Pattern: ${label}`,
    `Pattern type: ${pattern.pattern_type}`,
    `Sample size: ${pattern.sample_size} ${pattern.sample_size === 1 ? 'entry' : 'entries'}`,
    `Date range: ${range}`,
    '',
    `The ${pattern.entries.length} most recent entries tagged with this pattern:`,
    '',
    entryBlocks,
    '',
    'Write the 2–3 sentence observation now.',
  ].join('\n')
}

function buildModel() {
  return anthropic(MODEL_ID)
}

export async function synthesizeInsight(opts: {
  userProfileId: string
  pattern: PatternInput
  voicePrompt: string
}): Promise<string> {
  const { userProfileId, pattern, voicePrompt } = opts

  const { text, usage, providerMetadata } = await generateText({
    model: buildModel(),
    system: buildSystemPrompt(voicePrompt),
    prompt: buildUserPrompt(pattern),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.6,
    abortSignal: AbortSignal.timeout(45_000),
  })

  const out = text.trim()
  if (!out) throw new Error('Empty synthesis returned from model')

  const anthropicMeta = providerMetadata?.anthropic as
    | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
    | undefined

  // Best-effort usage record; do not block on failure.
  recordUsage({
    userId: userProfileId,
    feature: 'journal_insight',
    model: MODEL_ID,
    messages: 1,
    inputTokens: usage.inputTokens ?? 0,
    inputTokensCached: anthropicMeta?.cacheReadInputTokens ?? 0,
    cacheCreationTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  }).catch(() => undefined)

  return out
}

// ── Entry loading ───────────────────────────────────────────────────

async function loadEntriesForPattern(
  userProfileId: string,
  patternType: PatternType,
  patternKey: string,
  limit: number,
): Promise<PatternEntry[]> {
  const admin = createAdminSupabase()

  let entryIds: string[] = []

  if (patternType === 'aspect') {
    const { data } = await admin
      .from('journal_entry_aspects')
      .select('journal_entry_id, entry_date')
      .eq('user_id', userProfileId)
      .eq('aspect_key', patternKey)
      .order('entry_date', { ascending: false })
      .limit(limit * 2) // dedupe afterwards
    const seen = new Set<string>()
    for (const row of data ?? []) {
      const id = row.journal_entry_id as unknown as string | null
      if (!id || seen.has(id)) continue
      seen.add(id)
      entryIds.push(id)
      if (entryIds.length >= limit) break
    }
  } else if (patternType === 'lunar_phase') {
    const { data } = await admin
      .from('journal_entry_sky')
      .select('journal_entry_id, entry_date')
      .eq('user_id', userProfileId)
      .eq('moon_phase', patternKey)
      .order('entry_date', { ascending: false })
      .limit(limit)
    entryIds = (data ?? [])
      .map((r) => r.journal_entry_id as unknown as string | null)
      .filter((id): id is string => Boolean(id))
  } else if (patternType === 'lunar_sign') {
    const { data } = await admin
      .from('journal_entry_sky')
      .select('journal_entry_id, entry_date')
      .eq('user_id', userProfileId)
      .eq('moon_sign', patternKey)
      .order('entry_date', { ascending: false })
      .limit(limit)
    entryIds = (data ?? [])
      .map((r) => r.journal_entry_id as unknown as string | null)
      .filter((id): id is string => Boolean(id))
  } else if (patternType === 'retrograde') {
    const { data } = await admin
      .from('journal_entry_sky')
      .select('journal_entry_id, entry_date, retrogrades')
      .eq('user_id', userProfileId)
      .contains('retrogrades', [patternKey])
      .order('entry_date', { ascending: false })
      .limit(limit)
    entryIds = (data ?? [])
      .map((r) => r.journal_entry_id as unknown as string | null)
      .filter((id): id is string => Boolean(id))
  }

  if (entryIds.length === 0) return []

  const { data: entries } = await admin
    .from('journal_entries')
    .select('id, entry_date, title, body')
    .in('id', entryIds)

  // Re-sort to match entryIds order (most recent first).
  const byId = new Map((entries ?? []).map((e) => [e.id as unknown as string, e]))
  return entryIds
    .map((id) => byId.get(id))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .map((e) => ({
      entry_id: e.id as unknown as string,
      entry_date: e.entry_date as unknown as string,
      title: (e.title as unknown as string | null) ?? null,
      body: (e.body as unknown as string | null) ?? '',
    }))
}

// ── Public helpers ──────────────────────────────────────────────────

/**
 * Run a synthesis with a proposed voice against the user's biggest
 * pattern. No DB writes — used by the voice-panel preview.
 */
export async function synthesizePreview(opts: {
  userProfileId: string
  voicePrompt: string
}): Promise<{ text: string; patternLabel: string; sampleSize: number } | null> {
  const { userProfileId, voicePrompt } = opts
  const admin = createAdminSupabase()

  const { data: rows } = await admin
    .from('user_pattern_insights')
    .select('pattern_type, pattern_key, sample_size, first_seen, last_seen')
    .eq('user_id', userProfileId)
    .order('sample_size', { ascending: false })
    .order('last_seen', { ascending: false })
    .limit(1)

  const row = rows?.[0]
  if (!row) return null

  const patternType = row.pattern_type as PatternType
  const patternKey = row.pattern_key as string

  const entries = await loadEntriesForPattern(
    userProfileId,
    patternType,
    patternKey,
    ENTRIES_PER_SYNTHESIS,
  )

  const text = await synthesizeInsight({
    userProfileId,
    pattern: {
      pattern_type: patternType,
      pattern_key: patternKey,
      sample_size: row.sample_size as number,
      first_seen: (row.first_seen as unknown as string | null) ?? null,
      last_seen: (row.last_seen as unknown as string | null) ?? null,
      entries,
    },
    voicePrompt,
  })

  return {
    text,
    patternLabel: patternLabel(patternType, patternKey),
    sampleSize: row.sample_size as number,
  }
}

/**
 * Bulk regen every pattern row for the user with the supplied voice.
 * Marks each row as `ai_synthesizing_at = now()` up-front so the
 * insights page can show in-flight state while we work.
 *
 * Designed to be invoked from a route handler that's about to return
 * a response — the caller can `await` (slow) or fire-and-forget via
 * Next 15's `after()` (fast, work continues after response).
 *
 * Returns the number of rows attempted (not necessarily succeeded —
 * per-row failures are logged but do not abort the batch).
 */
export async function regenerateAllForUser(opts: {
  userProfileId: string
  voicePrompt: string
  voiceLabel: string
}): Promise<{ attempted: number; succeeded: number }> {
  const { userProfileId, voicePrompt, voiceLabel } = opts
  const admin = createAdminSupabase()

  // Mark every row as in-flight + clear stale ai_summary so the
  // page renders "synthesising…" while we work.
  await admin
    .from('user_pattern_insights')
    .update({ ai_synthesizing_at: new Date().toISOString(), ai_summary: null })
    .eq('user_id', userProfileId)

  const { data: rows } = await admin
    .from('user_pattern_insights')
    .select('id, pattern_type, pattern_key, sample_size, first_seen, last_seen')
    .eq('user_id', userProfileId)

  if (!rows || rows.length === 0) return { attempted: 0, succeeded: 0 }
  const rowList = rows

  let succeeded = 0
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++
      if (i >= rowList.length) return
      const row = rowList[i]
      try {
        const patternType = row.pattern_type as PatternType
        const patternKey = row.pattern_key as string
        const entries = await loadEntriesForPattern(
          userProfileId,
          patternType,
          patternKey,
          ENTRIES_PER_SYNTHESIS,
        )
        const text = await synthesizeInsight({
          userProfileId,
          pattern: {
            pattern_type: patternType,
            pattern_key: patternKey,
            sample_size: row.sample_size as number,
            first_seen: (row.first_seen as unknown as string | null) ?? null,
            last_seen: (row.last_seen as unknown as string | null) ?? null,
            entries,
          },
          voicePrompt,
        })
        await admin
          .from('user_pattern_insights')
          .update({
            ai_summary: text,
            ai_summary_voice_label: voiceLabel,
            ai_synthesizing_at: null,
          })
          .eq('id', row.id as unknown as string)
        succeeded++
      } catch (err) {
        console.error('[journal-insight-synthesis] row failed:', err)
        // Clear in-flight flag even on failure so the page does not hang.
        await admin
          .from('user_pattern_insights')
          .update({ ai_synthesizing_at: null })
          .eq('id', row.id as unknown as string)
      }
    }
  }

  const workers = Array.from({ length: Math.min(BATCH_CONCURRENCY, rows.length) }, () => worker())
  await Promise.all(workers)

  return { attempted: rows.length, succeeded }
}

/**
 * Re-synthesise the AI summary for whichever patterns a new journal entry
 * just touched (after refresh_user_pattern_insight has already updated
 * their sample_size/evidence). Keeps ai_summary from going stale relative
 * to sample_size as new entries land, using the user's saved voice.
 *
 * Meant to be called from a route/action that's about to return a
 * response, via Next's `after()` — errors are logged, never thrown, so a
 * synthesis failure can't affect the journal entry that triggered it.
 */
export async function resyncPatternSynthesisForTargets(opts: {
  userProfileId: string
  targets: PatternRefreshTarget[]
}): Promise<void> {
  const { userProfileId, targets } = opts
  if (targets.length === 0) return

  const admin = createAdminSupabase()

  const { data: settings } = await admin
    .from('user_settings')
    .select('journal_insight_voice, journal_insight_voice_label')
    .eq('user_id', userProfileId)
    .maybeSingle()

  const voiceLabel = settings?.journal_insight_voice_label?.trim() || VOICE_PRESETS[DEFAULT_VOICE_KEY].label
  const voicePrompt = resolveVoicePrompt(settings?.journal_insight_voice ?? null)

  await Promise.all(
    targets.map(async (target) => {
      try {
        const { data: row } = await admin
          .from('user_pattern_insights')
          .select('id, sample_size, first_seen, last_seen')
          .eq('user_id', userProfileId)
          .eq('pattern_type', target.patternType)
          .eq('pattern_key', target.patternKey)
          .maybeSingle()

        if (!row) return

        const entries = await loadEntriesForPattern(
          userProfileId,
          target.patternType,
          target.patternKey,
          ENTRIES_PER_SYNTHESIS,
        )

        const text = await synthesizeInsight({
          userProfileId,
          pattern: {
            pattern_type: target.patternType,
            pattern_key: target.patternKey,
            sample_size: row.sample_size as number,
            first_seen: (row.first_seen as unknown as string | null) ?? null,
            last_seen: (row.last_seen as unknown as string | null) ?? null,
            entries,
          },
          voicePrompt,
        })

        await admin
          .from('user_pattern_insights')
          .update({
            ai_summary: text,
            ai_summary_voice_label: voiceLabel,
            ai_synthesizing_at: null,
          })
          .eq('id', row.id as unknown as string)
      } catch (err) {
        console.error('[journal-insight-synthesis] resync failed for', target, err)
      }
    }),
  )
}
