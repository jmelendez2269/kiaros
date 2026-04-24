import { streamText, convertToModelMessages, type UIMessage, type ModelMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { gateway } from '@ai-sdk/gateway'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { buildOracleSystemPromptSegments } from '@/lib/ai/oracle-system-prompt'
import {
  ORACLE_MONTHLY_MESSAGE_LIMIT,
  getMonthlyUsage,
  getUserProfileId,
  recordUsage,
} from '@/lib/ai/usage'
import type { YearEphemeris } from '@/types/blueprint'
import type { Tables } from '@/types/database'

export const maxDuration = 60

const ORACLE_MODEL_ID = 'claude-sonnet-4-6'

function getErrorMessage(error: unknown): string {
  if (error == null) return 'unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return 'unknown error'
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as { messages?: UIMessage[] }
    const messages = body.messages ?? []
    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const profileId = await getUserProfileId(userId)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const usage = await getMonthlyUsage(profileId, 'oracle')
    if (usage.messageCount >= ORACLE_MONTHLY_MESSAGE_LIMIT) {
      return NextResponse.json(
        {
          error: 'monthly_limit_reached',
          message: `You've reached this month's Oracle limit of ${ORACLE_MONTHLY_MESSAGE_LIMIT} messages. It resets on the first of next month.`,
          limit: ORACLE_MONTHLY_MESSAGE_LIMIT,
          used: usage.messageCount,
        },
        { status: 429 }
      )
    }

    const supabase = await createServerSupabase()
    const today = new Date().toISOString().slice(0, 10)
    const currentYear = new Date().getFullYear()

    const [
      profileRes,
      ephemerisRes,
      blueprintRes,
      goalCategoriesRes,
      curriculumPlansRes,
      curriculumSessionsRes,
      dailyLogsRes,
      journalEntriesRes,
      quarterlyReviewsRes,
    ] = await Promise.all([
      supabase.from('user_profiles').select('*').maybeSingle(),
      supabase.from('ephemeris_cache').select('data').eq('year', currentYear).maybeSingle(),
      supabase
        .from('blueprints')
        .select('year_theme, quarters, months, weeks')
        .eq('plan_year', currentYear)
        .eq('status', 'ready')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('goal_categories')
        .select('name, description, success, sort_order')
        .order('sort_order', { ascending: true }),
      supabase
        .from('curriculum_plans')
        .select('topic, title, status, intensity, duration_weeks, weekly_hours, objectives, outcomes, skills, summary, start_date, approved_at, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('curriculum_sessions')
        .select('curriculum_title, week_number, title, session_type, scheduled_for, status')
        .gte('scheduled_for', today)
        .order('scheduled_for', { ascending: true })
        .limit(5),
      supabase
        .from('daily_logs')
        .select('log_date, energy_level, mood_tag, notes')
        .order('log_date', { ascending: false })
        .limit(3),
      supabase
        .from('journal_entries')
        .select('entry_date, title, body, mood_tag, is_ritual')
        .eq('oracle_memory', true)
        .order('entry_date', { ascending: false })
        .limit(5),
      supabase
        .from('quarterly_reviews')
        .select('quarter, completed_at, wins, challenges, pivots, next_quarter_intentions, ai_summary, created_at')
        .eq('plan_year', currentYear)
        .order('quarter', { ascending: false })
        .limit(2),
    ])

    const { cached, dynamic } = buildOracleSystemPromptSegments({
      profile: profileRes.data,
      ephemeris: (ephemerisRes.data?.data as unknown as YearEphemeris) ?? null,
      blueprint: blueprintRes.data,
      goalCategories: (goalCategoriesRes.data ?? []) as Pick<
        Tables<'goal_categories'>,
        'name' | 'description' | 'success' | 'sort_order'
      >[],
      curriculumPlans: (curriculumPlansRes.data ?? []) as Pick<
        Tables<'curriculum_plans'>,
        | 'topic' | 'title' | 'status' | 'intensity' | 'duration_weeks' | 'weekly_hours'
        | 'objectives' | 'outcomes' | 'skills' | 'summary' | 'start_date' | 'approved_at' | 'created_at'
      >[],
      curriculumSessions: (curriculumSessionsRes.data ?? []) as Pick<
        Tables<'curriculum_sessions'>,
        'curriculum_title' | 'week_number' | 'title' | 'session_type' | 'scheduled_for' | 'status'
      >[],
      dailyLogs: (dailyLogsRes.data ?? []) as Pick<
        Tables<'daily_logs'>,
        'log_date' | 'energy_level' | 'mood_tag' | 'notes'
      >[],
      journalEntries: (journalEntriesRes.data ?? []) as Pick<
        Tables<'journal_entries'>,
        'entry_date' | 'title' | 'body' | 'mood_tag' | 'is_ritual'
      >[],
      quarterlyReviews: (quarterlyReviewsRes.data ?? []) as Pick<
        Tables<'quarterly_reviews'>,
        | 'quarter' | 'completed_at' | 'wins' | 'challenges' | 'pivots'
        | 'next_quarter_intentions' | 'ai_summary' | 'created_at'
      >[],
      today,
    })

    const userMessages = await convertToModelMessages(messages)

    // Build system messages. The static layer (persona + natal chart + blueprint)
    // is marked for Anthropic prompt caching — ~90% discount on repeated reads.
    const systemMessages: ModelMessage[] = []
    if (cached) {
      systemMessages.push({
        role: 'system',
        content: cached,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      })
    }
    systemMessages.push({ role: 'system', content: dynamic })

    const model = process.env.VERCEL
      ? gateway(`anthropic/${ORACLE_MODEL_ID}`)
      : anthropic(ORACLE_MODEL_ID)

    const result = streamText({
      model,
      messages: [...systemMessages, ...userMessages],
      onFinish: async ({ usage: finalUsage, providerMetadata }) => {
        const anthropicMeta = providerMetadata?.anthropic as
          | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
          | undefined

        await recordUsage({
          userId: profileId,
          feature: 'oracle',
          model: ORACLE_MODEL_ID,
          messages: 1,
          inputTokens: finalUsage.inputTokens ?? 0,
          inputTokensCached: anthropicMeta?.cacheReadInputTokens ?? 0,
          cacheCreationTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
          outputTokens: finalUsage.outputTokens ?? 0,
        })
      },
    })

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onError: (error) => {
        const message = getErrorMessage(error)
        console.error('[oracle-chat] Stream error:', error)
        return message
      },
    })
  } catch (error) {
    console.error('[oracle-chat] Failed to respond:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
