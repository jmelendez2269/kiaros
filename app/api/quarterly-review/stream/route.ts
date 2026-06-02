/**
 * Streams the AI reflection for a completed quarterly review. Used by
 * the panel's COMPLETE REVIEW (after the bare save succeeds) and
 * REGENERATE flows so the user sees tokens land in real time instead
 * of waiting on a 10–15s synchronous round trip.
 *
 * The endpoint validates that the row exists, has user content, and is
 * marked completed — drafts cannot have a reflection generated. On
 * stream finish it writes ai_summary + stats_snapshot to the row and
 * records token usage. If the stream errors mid-way, no synthesis is
 * persisted (existing values stay in place).
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { streamText } from 'ai'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getUserProfileId, recordUsage } from '@/lib/ai/usage'
import {
  QUARTERLY_REVIEW_MAX_OUTPUT_TOKENS,
  loadQuarterlyReviewPromptBundle,
  quarterlyReviewModel,
} from '@/lib/ai/quarterly-review-generator'
import { updateQuarterlyReviewSynthesis } from '@/lib/reviews/save-review'

export const maxDuration = 90

interface RequestBody {
  year?: number
  quarter?: number
}

function getErrorMessage(error: unknown): string {
  if (error == null) return 'unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  try { return JSON.stringify(error) } catch { return 'unknown error' }
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody
    const year = Number(body.year)
    const quarter = Number(body.quarter)

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }
    if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      return NextResponse.json({ error: 'Invalid quarter (1–4)' }, { status: 400 })
    }

    const profileId = await getUserProfileId(userId)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const admin = createAdminSupabase()
    const { data: existing } = await admin
      .from('quarterly_reviews')
      .select('wins, challenges, pivots, next_quarter_intentions, completed_at')
      .eq('user_id', profileId)
      .eq('plan_year', year)
      .eq('quarter', quarter)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json({ error: 'No review exists for this quarter yet' }, { status: 404 })
    }
    if (!existing.completed_at) {
      return NextResponse.json(
        { error: 'Cannot generate reflection for a draft. Complete the review first.' },
        { status: 400 },
      )
    }

    const wins = coerceStringArray(existing.wins)
    const challenges = coerceStringArray(existing.challenges)
    const pivots = existing.pivots
    const nextQuarterIntentions = existing.next_quarter_intentions

    const bundle = await loadQuarterlyReviewPromptBundle({
      userProfileId: profileId,
      planYear: year,
      quarter,
      wins,
      challenges,
      pivots,
      nextQuarterIntentions,
    })

    const result = streamText({
      model: quarterlyReviewModel(),
      system: bundle.systemPrompt,
      prompt: bundle.userPrompt,
      maxOutputTokens: QUARTERLY_REVIEW_MAX_OUTPUT_TOKENS,
      temperature: 0.75,
      abortSignal: AbortSignal.timeout(60_000),
      onFinish: async ({ text, usage, providerMetadata }) => {
        try {
          const aiSummary = text.trim()
          if (!aiSummary) return
          await updateQuarterlyReviewSynthesis({
            userProfileId: profileId,
            planYear: year,
            quarter,
            aiSummary,
            statsSnapshot: bundle.statsSnapshot,
          })
          const anthropicMeta = providerMetadata?.anthropic as
            | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
            | undefined
          await recordUsage({
            userId: profileId,
            feature: 'quarterly_review',
            model: bundle.modelId,
            messages: 1,
            inputTokens: usage.inputTokens ?? 0,
            inputTokensCached: anthropicMeta?.cacheReadInputTokens ?? 0,
            cacheCreationTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
          })
        } catch (persistError) {
          console.error('[quarterly-review/stream] Failed to persist synthesis:', persistError)
        }
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[quarterly-review/stream] Failed:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
