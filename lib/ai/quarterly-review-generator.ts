/**
 * quarterly-review-generator.ts
 *
 * Generates the AI synthesis + stats_snapshot for a completed quarterly
 * review. Called from the /api/quarterly-review route handler after the
 * user content has been saved.
 *
 * Stats are pulled from daily_logs, journal_entries, oracle_captures,
 * and curriculum_sessions for the quarter's date range. The synthesis
 * is a 2–3 paragraph Claude write-up — see quarterly-review-system-prompt.ts.
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { gateway } from '@ai-sdk/gateway'
import { createAdminSupabase } from '@/lib/supabase/admin'
import {
  assembleQuarterlyReviewSystemPrompt,
  assembleQuarterlyReviewUserPrompt,
  type PriorQuarterContext,
  type QuarterlyReviewPromptContext,
  type QuarterlyReviewStats,
} from './quarterly-review-system-prompt'
import { recordUsage } from './usage'
import type { BlueprintOutput, NatalChart } from '@/types/blueprint'

const MODEL_ID = 'claude-sonnet-4-6'
const MAX_OUTPUT_TOKENS = 600

const QUARTER_MONTHS_LABEL: Record<number, string> = {
  1: 'Jan — Mar',
  2: 'Apr — Jun',
  3: 'Jul — Sep',
  4: 'Oct — Dec',
}

export interface GenerateReviewSummaryOptions {
  userProfileId: string
  planYear: number
  quarter: number   // 1–4
  wins: string[]
  challenges: string[]
  pivots: string | null
  nextQuarterIntentions: string | null
}

export interface GenerateReviewSummaryResult {
  aiSummary: string
  statsSnapshot: QuarterlyReviewStats
  modelUsed: string
}

export interface QuarterlyReviewPromptBundle {
  systemPrompt: string
  userPrompt: string
  statsSnapshot: QuarterlyReviewStats
  modelId: string
}

export const QUARTERLY_REVIEW_MODEL_ID = MODEL_ID
export const QUARTERLY_REVIEW_MAX_OUTPUT_TOKENS = MAX_OUTPUT_TOKENS

export function quarterlyReviewModel() {
  return process.env.VERCEL ? gateway(`anthropic/${MODEL_ID}`) : anthropic(MODEL_ID)
}

/**
 * Loads everything needed to build the LLM call for a quarterly review,
 * but does not invoke the model. Shared by both the non-streaming
 * generator and the streaming endpoint so they stay aligned on prompts
 * and stats.
 */
export async function loadQuarterlyReviewPromptBundle(
  opts: GenerateReviewSummaryOptions,
): Promise<QuarterlyReviewPromptBundle> {
  const { userProfileId, planYear, quarter, wins, challenges, pivots, nextQuarterIntentions } = opts

  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter: ${quarter}`)
  }

  const admin = createAdminSupabase()
  const { start, end } = quarterDateRange(planYear, quarter)
  const prior = priorQuarterCoords(planYear, quarter)

  const [
    profileRes,
    blueprintRes,
    patternsRes,
    dailyLogsRes,
    journalEntriesRes,
    captureRes,
    sessionsRes,
    priorReviewRes,
  ] = await Promise.all([
    admin
      .from('user_profiles')
      .select('display_name, natal_chart, year_vision, word_of_year, what_to_release')
      .eq('id', userProfileId)
      .maybeSingle(),
    admin
      .from('blueprints')
      .select('year_theme, quarters')
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
      .order('confidence', { ascending: false })
      .limit(8),
    admin
      .from('daily_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userProfileId)
      .gte('log_date', start)
      .lte('log_date', end),
    admin
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userProfileId)
      .gte('entry_date', start)
      .lte('entry_date', end),
    admin
      .from('oracle_captures')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userProfileId)
      .gte('created_at', `${start}T00:00:00Z`)
      .lte('created_at', `${end}T23:59:59Z`),
    admin
      .from('curriculum_sessions')
      .select('status')
      .eq('user_id', userProfileId)
      .gte('scheduled_for', start)
      .lte('scheduled_for', end),
    admin
      .from('quarterly_reviews')
      .select('quarter, plan_year, ai_summary, wins, challenges, pivots, next_quarter_intentions')
      .eq('user_id', userProfileId)
      .eq('plan_year', prior.year)
      .eq('quarter', prior.quarter)
      .not('completed_at', 'is', null)
      .maybeSingle(),
  ])

  if (!profileRes.data) {
    throw new Error(`Profile not found for user ${userProfileId}`)
  }
  if (!blueprintRes.data) {
    throw new Error(`No ready blueprint for user ${userProfileId} year ${planYear}`)
  }
  if (!profileRes.data.natal_chart) {
    throw new Error('Natal chart missing — cannot personalise summary')
  }

  const quarters = (blueprintRes.data.quarters ?? []) as unknown as BlueprintOutput['quarters']
  const quarterBlueprint = quarters.find((q) => q.quarter === quarter) ?? null

  const sessionRows = sessionsRes.data ?? []
  const sessionsCompleted = sessionRows.filter((s) => s.status === 'done').length

  const statsSnapshot: QuarterlyReviewStats = {
    daily_logs_count: dailyLogsRes.count ?? 0,
    journal_entries_count: journalEntriesRes.count ?? 0,
    oracle_captures_count: captureRes.count ?? 0,
    curriculum_sessions_completed: sessionsCompleted,
    curriculum_sessions_scheduled: sessionRows.length,
  }

  const priorQuarter: PriorQuarterContext | null = priorReviewRes.data
    ? {
        quarter: priorReviewRes.data.quarter,
        planYear: priorReviewRes.data.plan_year,
        aiSummary: priorReviewRes.data.ai_summary,
        wins: coerceStringArray(priorReviewRes.data.wins),
        challenges: coerceStringArray(priorReviewRes.data.challenges),
        pivots: priorReviewRes.data.pivots,
        nextQuarterIntentions: priorReviewRes.data.next_quarter_intentions,
      }
    : null

  const ctx: QuarterlyReviewPromptContext = {
    userName: profileRes.data.display_name ?? 'there',
    natalChart: profileRes.data.natal_chart as unknown as NatalChart,
    planYear,
    quarter,
    quarterMonths: QUARTER_MONTHS_LABEL[quarter] ?? '',
    quarterBlueprint,
    yearTheme: blueprintRes.data.year_theme ?? null,
    yearVision: profileRes.data.year_vision ?? null,
    wordOfYear: profileRes.data.word_of_year ?? null,
    whatToRelease: profileRes.data.what_to_release ?? null,
    wins,
    challenges,
    pivots,
    nextQuarterIntentions,
    stats: statsSnapshot,
    journalPatterns: patternsRes.data ?? [],
    priorQuarter,
  }

  return {
    systemPrompt: assembleQuarterlyReviewSystemPrompt(),
    userPrompt: assembleQuarterlyReviewUserPrompt(ctx),
    statsSnapshot,
    modelId: MODEL_ID,
  }
}

function quarterDateRange(planYear: number, quarter: number): { start: string; end: string } {
  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const start = `${planYear}-${String(startMonth).padStart(2, '0')}-01`
  const lastDay = new Date(planYear, endMonth, 0).getDate()
  const end = `${planYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function priorQuarterCoords(planYear: number, quarter: number): { year: number; quarter: number } {
  return quarter === 1 ? { year: planYear - 1, quarter: 4 } : { year: planYear, quarter: quarter - 1 }
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

export async function generateQuarterlyReviewSummary(
  opts: GenerateReviewSummaryOptions,
): Promise<GenerateReviewSummaryResult> {
  const bundle = await loadQuarterlyReviewPromptBundle(opts)

  const { text, usage, providerMetadata } = await generateText({
    model: quarterlyReviewModel(),
    system: bundle.systemPrompt,
    prompt: bundle.userPrompt,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    temperature: 0.75,
    abortSignal: AbortSignal.timeout(60_000),
  })

  const aiSummary = text.trim()
  if (!aiSummary) {
    throw new Error('Empty review summary returned from model')
  }

  const anthropicMeta = providerMetadata?.anthropic as
    | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
    | undefined
  await recordUsage({
    userId: opts.userProfileId,
    feature: 'quarterly_review',
    model: bundle.modelId,
    messages: 1,
    inputTokens: usage.inputTokens ?? 0,
    inputTokensCached: anthropicMeta?.cacheReadInputTokens ?? 0,
    cacheCreationTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  })

  return {
    aiSummary,
    statsSnapshot: bundle.statsSnapshot,
    modelUsed: bundle.modelId,
  }
}
