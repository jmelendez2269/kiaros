import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { gateway } from '@ai-sdk/gateway'
import { createServerSupabase } from '@/lib/supabase/server'
import { buildOracleSystemPrompt } from '@/lib/ai/oracle-system-prompt'
import type { YearEphemeris } from '@/types/blueprint'
import type { Tables } from '@/types/database'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()
  const supabase = await createServerSupabase()
  const today = new Date().toISOString().slice(0, 10)
  const currentYear = new Date().getFullYear()

  // Fetch grounding data in parallel
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
    supabase
      .from('ephemeris_cache')
      .select('data')
      .eq('year', currentYear)
      .maybeSingle(),
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
      .limit(4),
    supabase
      .from('curriculum_sessions')
      .select('curriculum_title, week_number, title, session_type, scheduled_for, status')
      .gte('scheduled_for', today)
      .order('scheduled_for', { ascending: true })
      .limit(8),
    supabase
      .from('daily_logs')
      .select('log_date, energy_level, mood_tag, notes')
      .order('log_date', { ascending: false })
      .limit(7),
    supabase
      .from('journal_entries')
      .select('entry_date, title, body, mood_tag, is_ritual')
      .eq('oracle_memory', true)
      .order('entry_date', { ascending: false })
      .limit(20),
    supabase
      .from('quarterly_reviews')
      .select('quarter, completed_at, wins, challenges, pivots, next_quarter_intentions, ai_summary, created_at')
      .eq('plan_year', currentYear)
      .order('quarter', { ascending: false })
      .limit(2),
  ])

  const systemPrompt = buildOracleSystemPrompt({
    profile: profileRes.data,
    ephemeris: (ephemerisRes.data?.data as unknown as YearEphemeris) ?? null,
    blueprint: blueprintRes.data,
    goalCategories: (goalCategoriesRes.data ?? []) as Pick<
      Tables<'goal_categories'>,
      'name' | 'description' | 'success' | 'sort_order'
    >[],
    curriculumPlans: (curriculumPlansRes.data ?? []) as Pick<
      Tables<'curriculum_plans'>,
      | 'topic'
      | 'title'
      | 'status'
      | 'intensity'
      | 'duration_weeks'
      | 'weekly_hours'
      | 'objectives'
      | 'outcomes'
      | 'skills'
      | 'summary'
      | 'start_date'
      | 'approved_at'
      | 'created_at'
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
      | 'quarter'
      | 'completed_at'
      | 'wins'
      | 'challenges'
      | 'pivots'
      | 'next_quarter_intentions'
      | 'ai_summary'
      | 'created_at'
    >[],
    today,
  })

  // Gateway in prod (Vercel OIDC), direct Anthropic SDK for local dev.
  // Same pattern as lib/ai/blueprint-generator.ts.
  const model = process.env.VERCEL
    ? gateway('anthropic/claude-sonnet-4.6')
    : anthropic('claude-sonnet-4.6')

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
