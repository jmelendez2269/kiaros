/**
 * save-review.ts
 *
 * Upsert helpers for quarterly_reviews. Called from the
 * /api/quarterly-review route handler after Clerk auth + profile
 * resolution. Uses the admin client because the route handler has
 * already proven the user owns the row.
 *
 * Two helpers, by design:
 *   saveQuarterlyReview          — upserts user content (wins, challenges,
 *                                  pivots, intentions). Always stamps
 *                                  completed_at. Leaves ai_summary and
 *                                  stats_snapshot untouched on existing rows.
 *   updateQuarterlyReviewSynthesis — best-effort follow-up that updates
 *                                  ai_summary + stats_snapshot for a row
 *                                  that already exists. The route runs
 *                                  this after Claude produces the synth so
 *                                  AI failures don't lose the user's save.
 */

import { createAdminSupabase } from '@/lib/supabase/admin'
import type { QuarterlyReviewStats } from '@/lib/ai/quarterly-review-system-prompt'

const MAX_BULLET_LENGTH = 400
const MAX_TEXT_LENGTH = 2000
const MAX_BULLETS = 10

export interface SaveReviewInput {
  userProfileId: string
  planYear: number
  quarter: number // 1–4
  wins: string[]
  challenges: string[]
  pivots: string | null
  nextQuarterIntentions: string | null
  /**
   * When true (the default), stamps `completed_at = now()` and the review
   * surfaces as COMPLETED in the UI. When false, the upsert leaves
   * `completed_at` untouched — a brand-new row stays at NULL and an
   * existing completed row keeps its original timestamp. Use false for
   * explicit "save draft" actions.
   */
  markComplete?: boolean
}

export interface SaveReviewResult {
  quarter: number
  completedAt: string | null
  markedComplete: boolean
}

function sanitizeBullets(raw: string[]): string[] {
  const cleaned: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed) continue
    cleaned.push(trimmed.slice(0, MAX_BULLET_LENGTH))
    if (cleaned.length >= MAX_BULLETS) break
  }
  return cleaned
}

function sanitizeText(raw: string | null): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.slice(0, MAX_TEXT_LENGTH)
}

export async function saveQuarterlyReview(input: SaveReviewInput): Promise<SaveReviewResult> {
  const { userProfileId, planYear, quarter, markComplete = true } = input

  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter: ${quarter}`)
  }

  const wins = sanitizeBullets(input.wins)
  const challenges = sanitizeBullets(input.challenges)
  const pivots = sanitizeText(input.pivots)
  const nextQuarterIntentions = sanitizeText(input.nextQuarterIntentions)

  const admin = createAdminSupabase()

  // Drafts must not clear an existing completed_at, so for draft saves we
  // skip the column entirely and let the existing row keep its timestamp.
  // Brand-new draft rows land with completed_at = NULL by default.
  type ReviewUpsertRow = {
    user_id: string
    plan_year: number
    quarter: number
    wins: string[]
    challenges: string[]
    pivots: string | null
    next_quarter_intentions: string | null
    completed_at?: string
  }
  const completedAt = markComplete ? new Date().toISOString() : null
  const upsertRow: ReviewUpsertRow = {
    user_id: userProfileId,
    plan_year: planYear,
    quarter,
    wins,
    challenges,
    pivots,
    next_quarter_intentions: nextQuarterIntentions,
  }
  if (completedAt) upsertRow.completed_at = completedAt

  const { error } = await admin
    .from('quarterly_reviews')
    .upsert(upsertRow, { onConflict: 'user_id,plan_year,quarter' })

  if (error) {
    throw new Error(`Failed to save quarterly review: ${error.message}`)
  }

  let resolvedCompletedAt: string | null = completedAt
  if (!markComplete) {
    const { data } = await admin
      .from('quarterly_reviews')
      .select('completed_at')
      .eq('user_id', userProfileId)
      .eq('plan_year', planYear)
      .eq('quarter', quarter)
      .maybeSingle()
    resolvedCompletedAt = data?.completed_at ?? null
  }

  return { quarter, completedAt: resolvedCompletedAt, markedComplete: markComplete }
}

export interface UpdateSynthesisInput {
  userProfileId: string
  planYear: number
  quarter: number
  aiSummary: string
  statsSnapshot: QuarterlyReviewStats
}

export async function updateQuarterlyReviewSynthesis(input: UpdateSynthesisInput): Promise<void> {
  const { userProfileId, planYear, quarter, aiSummary, statsSnapshot } = input

  const admin = createAdminSupabase()
  const { error } = await admin
    .from('quarterly_reviews')
    .update({
      ai_summary: aiSummary,
      stats_snapshot: statsSnapshot as unknown as Record<string, number>,
    })
    .eq('user_id', userProfileId)
    .eq('plan_year', planYear)
    .eq('quarter', quarter)

  if (error) {
    throw new Error(`Failed to update quarterly review synthesis: ${error.message}`)
  }
}
