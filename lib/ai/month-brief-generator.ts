/**
 * month-brief-generator.ts
 *
 * Generate (or fetch from cache) the per-month narrative brief for the
 * Month tab of /year. Called from the /api/month-brief route handler on
 * first view of each month — see also lib/ai/month-brief-system-prompt.ts.
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  assembleMonthBriefSystemPrompt,
  assembleMonthBriefUserPrompt,
  type MonthBriefPromptContext,
  type PriorMonthBriefContext,
  type PriorQuarterReviewContext,
} from './month-brief-system-prompt'
import { recordUsage } from './usage'
import type { BlueprintOutput, MonthBlueprint, NatalChart } from '@/types/blueprint'

const MODEL_ID = 'claude-sonnet-4-6'
const MAX_OUTPUT_TOKENS = 700

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export interface MonthBriefResult {
  briefText: string
  modelUsed: string
  generatedAt: string
  fromCache: boolean
  pinned: boolean
}

export class MonthBriefPinnedError extends Error {
  constructor() {
    super('This brief is pinned. Unpin it before regenerating.')
    this.name = 'MonthBriefPinnedError'
  }
}

interface FetchOrGenerateOptions {
  userProfileId: string
  planYear: number
  month: number    // 1–12
  /**
   * When true, force a fresh generation even if a cached brief exists.
   * Used by the regen action on the Month panel.
   */
  forceRegen?: boolean
}

export async function fetchOrGenerateMonthBrief(
  opts: FetchOrGenerateOptions,
): Promise<MonthBriefResult> {
  const { userProfileId, planYear, month, forceRegen = false } = opts

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`)
  }

  const admin = createAdminSupabase()

  const { data: existing } = await admin
    .from('month_briefs')
    .select('brief_text, model_used, generated_at, pinned')
    .eq('user_id', userProfileId)
    .eq('plan_year', planYear)
    .eq('month', month)
    .maybeSingle()

  if (existing?.brief_text && !forceRegen) {
    return {
      briefText: existing.brief_text,
      modelUsed: existing.model_used,
      generatedAt: existing.generated_at,
      fromCache: true,
      pinned: Boolean(existing.pinned),
    }
  }

  if (existing?.pinned && forceRegen) {
    throw new MonthBriefPinnedError()
  }

  // Prior month coordinates — wraps to December of prior year for January.
  const priorMonth = month === 1 ? 12 : month - 1
  const priorMonthYear = month === 1 ? planYear - 1 : planYear

  // ── Load all the context we need ────────────────────────────────────
  const [
    profileRes,
    blueprintRes,
    patternsRes,
    capturesRes,
    sessionsRes,
    priorBriefRes,
    quarterReviewRes,
  ] = await Promise.all([
    admin
      .from('user_profiles')
      .select('display_name, natal_chart, year_vision, word_of_year, what_to_release')
      .eq('id', userProfileId)
      .maybeSingle(),
    admin
      .from('blueprints')
      .select('id, year_theme, months, quarters')
      .eq('user_id', userProfileId)
      .eq('plan_year', planYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('user_pattern_insights')
      .select('pattern_type, pattern_key, sample_size, confidence, summary, evidence')
      .eq('user_id', userProfileId)
      .order('updated_at', { ascending: false })
      .limit(12),
    admin
      .from('oracle_captures')
      .select('captured_text, created_at')
      .eq('user_id', userProfileId)
      .eq('include_in_planner', true)
      .order('created_at', { ascending: false })
      .limit(8),
    (() => {
      const start = `${planYear}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(planYear, month, 0).getDate()
      const end = `${planYear}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      return admin
        .from('curriculum_sessions')
        .select('title, description, session_type, scheduled_for')
        .eq('user_id', userProfileId)
        .gte('scheduled_for', start)
        .lte('scheduled_for', end)
        .order('scheduled_for', { ascending: true })
    })(),
    admin
      .from('month_briefs')
      .select('brief_text, month, plan_year')
      .eq('user_id', userProfileId)
      .eq('plan_year', priorMonthYear)
      .eq('month', priorMonth)
      .maybeSingle(),
    admin
      .from('quarterly_reviews')
      .select('quarter, plan_year, ai_summary, wins, challenges, pivots, next_quarter_intentions, completed_at')
      .eq('user_id', userProfileId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!profileRes.data) {
    throw new Error(`Profile not found for user ${userProfileId}`)
  }
  if (!blueprintRes.data) {
    throw new Error(`No ready blueprint for user ${userProfileId} year ${planYear}`)
  }
  if (!profileRes.data.natal_chart) {
    throw new Error('Natal chart missing — cannot personalise brief')
  }

  const months = (blueprintRes.data.months ?? []) as unknown as MonthBlueprint[]
  const quarters = (blueprintRes.data.quarters ?? []) as unknown as BlueprintOutput['quarters']
  const monthBlueprint = months.find((m) => m.month === month)
  if (!monthBlueprint) {
    throw new Error(`No month blueprint for month ${month} in plan_year ${planYear}`)
  }
  const quarterBlueprint = quarters.find((q) => q.quarter === Math.floor((month - 1) / 3) + 1) ?? null

  const priorMonthBrief: PriorMonthBriefContext | null = priorBriefRes.data?.brief_text
    ? {
        month: priorMonth,
        monthName: MONTH_NAMES[priorMonth - 1] ?? '',
        planYear: priorMonthYear,
        text: priorBriefRes.data.brief_text,
      }
    : null

  const priorQuarterReview: PriorQuarterReviewContext | null = quarterReviewRes.data
    ? {
        quarter: quarterReviewRes.data.quarter,
        planYear: quarterReviewRes.data.plan_year,
        aiSummary: quarterReviewRes.data.ai_summary,
        wins: quarterReviewRes.data.wins,
        challenges: quarterReviewRes.data.challenges,
        pivots: quarterReviewRes.data.pivots,
        nextQuarterIntentions: quarterReviewRes.data.next_quarter_intentions,
      }
    : null

  const ctx: MonthBriefPromptContext = {
    userName: profileRes.data.display_name ?? 'there',
    natalChart: profileRes.data.natal_chart as unknown as NatalChart,
    planYear,
    month,
    monthName: MONTH_NAMES[month - 1] ?? '',
    monthBlueprint,
    quarterBlueprint,
    yearTheme: blueprintRes.data.year_theme ?? null,
    yearVision: profileRes.data.year_vision ?? null,
    wordOfYear: profileRes.data.word_of_year ?? null,
    whatToRelease: profileRes.data.what_to_release ?? null,
    journalPatterns: patternsRes.data ?? [],
    oraclePlannerCaptures: capturesRes.data ?? [],
    curriculumSessions: sessionsRes.data ?? [],
    priorMonthBrief,
    priorQuarterReview,
  }

  const systemPrompt = assembleMonthBriefSystemPrompt()
  const userPrompt = assembleMonthBriefUserPrompt(ctx)

  const model = anthropic(MODEL_ID)

  const { text, usage, providerMetadata } = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.75,
    abortSignal: AbortSignal.timeout(60_000),
  })

  const briefText = text.trim()
  if (!briefText) {
    throw new Error('Empty brief returned from model')
  }

  const generatedAt = new Date().toISOString()

  await admin
    .from('month_briefs')
    .upsert(
      {
        user_id: userProfileId,
        blueprint_id: blueprintRes.data.id,
        plan_year: planYear,
        month,
        brief_text: briefText,
        model_used: MODEL_ID,
        generated_at: generatedAt,
      },
      { onConflict: 'user_id,plan_year,month' },
    )

  const anthropicMeta = providerMetadata?.anthropic as
    | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
    | undefined
  await recordUsage({
    userId: userProfileId,
    feature: 'month_brief',
    model: MODEL_ID,
    messages: 1,
    inputTokens: usage.inputTokens ?? 0,
    inputTokensCached: anthropicMeta?.cacheReadInputTokens ?? 0,
    cacheCreationTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  })

  return {
    briefText,
    modelUsed: MODEL_ID,
    generatedAt,
    fromCache: false,
    pinned: false,
  }
}

interface SetPinnedOptions {
  userProfileId: string
  planYear: number
  month: number
  pinned: boolean
}

export async function setMonthBriefPinned(opts: SetPinnedOptions): Promise<{ pinned: boolean }> {
  const { userProfileId, planYear, month, pinned } = opts
  const admin = createAdminSupabase()

  const { data, error } = await admin
    .from('month_briefs')
    .update({ pinned })
    .eq('user_id', userProfileId)
    .eq('plan_year', planYear)
    .eq('month', month)
    .select('pinned')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('No brief exists for this month to pin')

  return { pinned: Boolean(data.pinned) }
}

interface SetTextOptions {
  userProfileId: string
  planYear: number
  month: number
  text: string
}

export async function setMonthBriefText(
  opts: SetTextOptions,
): Promise<{ briefText: string; modelUsed: string; generatedAt: string; editedAt: string; pinned: boolean }> {
  const { userProfileId, planYear, month, text } = opts
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Brief text cannot be empty')

  const admin = createAdminSupabase()
  const editedAt = new Date().toISOString()

  const { data, error } = await admin
    .from('month_briefs')
    .update({ brief_text: trimmed, edited_at: editedAt })
    .eq('user_id', userProfileId)
    .eq('plan_year', planYear)
    .eq('month', month)
    .select('brief_text, model_used, generated_at, edited_at, pinned')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('No brief exists for this month to edit')

  return {
    briefText: data.brief_text,
    modelUsed: data.model_used,
    generatedAt: data.generated_at,
    editedAt: data.edited_at ?? editedAt,
    pinned: Boolean(data.pinned),
  }
}
