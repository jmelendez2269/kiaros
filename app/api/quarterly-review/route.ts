import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { getUserProfileId } from '@/lib/ai/usage'
import { saveQuarterlyReview, updateQuarterlyReviewSynthesis } from '@/lib/reviews/save-review'
import { generateQuarterlyReviewSummary } from '@/lib/ai/quarterly-review-generator'
import type { QuarterlyReviewStats } from '@/lib/ai/quarterly-review-system-prompt'

export const maxDuration = 90

interface RequestBody {
  year?: number
  quarter?: number
  wins?: unknown
  challenges?: unknown
  pivots?: unknown
  nextQuarterIntentions?: unknown
  markComplete?: boolean
  regenSummary?: boolean
}

function getErrorMessage(error: unknown): string {
  if (error == null) return 'unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  try { return JSON.stringify(error) } catch { return 'unknown error' }
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string')
}

function coerceNullableString(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  return raw
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(req.url)
    const year = Number(url.searchParams.get('year'))
    const quarter = Number(url.searchParams.get('quarter'))

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
    const { data: row } = await admin
      .from('quarterly_reviews')
      .select('quarter, completed_at, wins, challenges, pivots, next_quarter_intentions, ai_summary, stats_snapshot')
      .eq('user_id', profileId)
      .eq('plan_year', year)
      .eq('quarter', quarter)
      .maybeSingle()

    if (!row) {
      return NextResponse.json({ exists: false }, { status: 200 })
    }

    return NextResponse.json({
      exists: true,
      quarter: row.quarter,
      completedAt: row.completed_at,
      wins: coerceStringArray(row.wins),
      challenges: coerceStringArray(row.challenges),
      pivots: row.pivots,
      nextQuarterIntentions: row.next_quarter_intentions,
      aiSummary: row.ai_summary,
      statsSnapshot:
        row.stats_snapshot && typeof row.stats_snapshot === 'object'
          ? (row.stats_snapshot as Record<string, number>)
          : null,
    })
  } catch (error) {
    console.error('[quarterly-review] GET failed:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
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

    // ─── Regenerate-only mode ─────────────────────────────────────────────
    // Re-runs the AI synthesis against the row's existing user content.
    // Does NOT touch wins/challenges/pivots/intentions/completed_at.
    if (body.regenSummary === true) {
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
          { error: 'Cannot regenerate reflection for a draft. Complete the review first.' },
          { status: 400 },
        )
      }

      const existingWins = Array.isArray(existing.wins)
        ? (existing.wins as unknown[]).filter((v): v is string => typeof v === 'string')
        : []
      const existingChallenges = Array.isArray(existing.challenges)
        ? (existing.challenges as unknown[]).filter((v): v is string => typeof v === 'string')
        : []

      const synth = await generateQuarterlyReviewSummary({
        userProfileId: profileId,
        planYear: year,
        quarter,
        wins: existingWins,
        challenges: existingChallenges,
        pivots: existing.pivots,
        nextQuarterIntentions: existing.next_quarter_intentions,
      })
      await updateQuarterlyReviewSynthesis({
        userProfileId: profileId,
        planYear: year,
        quarter,
        aiSummary: synth.aiSummary,
        statsSnapshot: synth.statsSnapshot,
      })

      return NextResponse.json({
        quarter,
        completedAt: existing.completed_at,
        markedComplete: true,
        aiSummary: synth.aiSummary,
        statsSnapshot: synth.statsSnapshot,
      })
    }

    // ─── Save mode (draft or complete) ────────────────────────────────────
    const wins = coerceStringArray(body.wins)
    const challenges = coerceStringArray(body.challenges)
    const pivots = coerceNullableString(body.pivots)
    const nextQuarterIntentions = coerceNullableString(body.nextQuarterIntentions)
    const markComplete = body.markComplete !== false   // default true

    const saved = await saveQuarterlyReview({
      userProfileId: profileId,
      planYear: year,
      quarter,
      wins,
      challenges,
      pivots,
      nextQuarterIntentions,
      markComplete,
    })

    // AI synthesis only runs on completion. Drafts skip it — they're
    // work-in-progress and we don't burn tokens on incomplete content.
    let aiSummary: string | null = null
    let statsSnapshot: QuarterlyReviewStats | null = null
    if (markComplete) {
      try {
        const synth = await generateQuarterlyReviewSummary({
          userProfileId: profileId,
          planYear: year,
          quarter,
          wins,
          challenges,
          pivots,
          nextQuarterIntentions,
        })
        aiSummary = synth.aiSummary
        statsSnapshot = synth.statsSnapshot
        await updateQuarterlyReviewSynthesis({
          userProfileId: profileId,
          planYear: year,
          quarter,
          aiSummary,
          statsSnapshot,
        })
      } catch (synthError) {
        console.error('[quarterly-review] AI synthesis failed:', synthError)
      }
    }

    return NextResponse.json({
      ...saved,
      aiSummary,
      statsSnapshot,
    })
  } catch (error) {
    console.error('[quarterly-review] Failed:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
