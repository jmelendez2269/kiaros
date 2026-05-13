import { streamText, type ModelMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { gateway } from '@ai-sdk/gateway'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { resolveUserAccess, type ProductEntitlementRecord } from '@/lib/commerce/entitlements'
import { createServerSupabase } from '@/lib/supabase/server'
import { buildOracleSystemPromptSegments } from '@/lib/ai/oracle-system-prompt'
import {
  ORACLE_EXPLAIN_MONTHLY_LIMIT,
  getMonthlyUsage,
  getUserProfileId,
  recordUsage,
} from '@/lib/ai/usage'
import type { YearEphemeris } from '@/types/blueprint'
import type { Tables } from '@/types/database'

export const maxDuration = 30

const EXPLAIN_MODEL_ID = 'claude-sonnet-4-6'
const MAX_PROMPT_CHARS = 1200
const MAX_OUTPUT_TOKENS = 600

// One-shot inline synthesis for Planner-only users — the fallback when
// they click "Ask Oracle about this …" on the dashboard. Returns a plain
// text stream (no chat back-and-forth). Planner+Oracle users go to the
// real chat at /oracle instead and never hit this endpoint.

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

    const body = (await req.json()) as { prompt?: string }
    const prompt = (body.prompt ?? '').trim()
    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: `Prompt exceeds ${MAX_PROMPT_CHARS} characters` },
        { status: 400 }
      )
    }

    const profileId = await getUserProfileId(userId)
    if (!profileId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const supabase = await createServerSupabase()
    const today = new Date().toISOString().slice(0, 10)
    const currentYear = new Date().getFullYear()

    const [
      profileRes,
      ephemerisRes,
      blueprintRes,
      goalCategoriesRes,
      patternInsightsRes,
      entitlementsRes,
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
        .from('user_pattern_insights')
        .select('pattern_type, pattern_key, sample_size, confidence, first_seen, last_seen, summary, evidence')
        .order('updated_at', { ascending: false })
        .limit(8),
      supabase
        .from('product_entitlements')
        .select('id, user_id, source, source_order_id, product_tier, planner_year, oracle_enabled, starts_at, ends_at, status, created_at, access_plan')
        .eq('user_id', profileId)
        .neq('status', 'revoked'),
    ])

    // Inline syntheses are open to any signed-in user — the upgrade ask
    // sits at the *end* of the response ("Continue in Oracle →") and on
    // the 429 path, not the entry point. Entitlement is only consulted
    // here to decide whether the 429 upgrade CTA should fire.
    const access = resolveUserAccess((entitlementsRes.data ?? []) as ProductEntitlementRecord[])

    const usage = await getMonthlyUsage(profileId, 'oracle_explain')
    if (usage.messageCount >= ORACLE_EXPLAIN_MONTHLY_LIMIT) {
      return NextResponse.json(
        {
          error: 'monthly_limit_reached',
          message: `You've used this month's ${ORACLE_EXPLAIN_MONTHLY_LIMIT} inline Oracle questions. Upgrade to Planner + Oracle for unlimited conversation, or wait until the first of next month.`,
          limit: ORACLE_EXPLAIN_MONTHLY_LIMIT,
          used: usage.messageCount,
          upgradeAvailable: !access.hasOracleAccess,
        },
        { status: 429 }
      )
    }

    const { cached, dynamic } = buildOracleSystemPromptSegments({
      profile: profileRes.data,
      ephemeris: (ephemerisRes.data?.data as unknown as YearEphemeris) ?? null,
      blueprint: blueprintRes.data,
      goalCategories: (goalCategoriesRes.data ?? []) as Pick<
        Tables<'goal_categories'>,
        'name' | 'description' | 'success' | 'sort_order'
      >[],
      curriculumPlans: [],
      curriculumSessions: [],
      dailyLogs: [],
      journalEntries: [],
      oracleCaptures: [],
      patternInsights: (patternInsightsRes.data ?? []) as Pick<
        Tables<'user_pattern_insights'>,
        'pattern_type' | 'pattern_key' | 'sample_size' | 'confidence' | 'first_seen' | 'last_seen' | 'summary' | 'evidence'
      >[],
      quarterlyReviews: [],
      today,
    })

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

    // Tight constraints for one-shot mode. The Oracle would normally
    // invite follow-ups; here we're cutting that path off so the
    // response reads as a complete short reading. Voice rules stay.
    systemMessages.push({
      role: 'system',
      content: [
        'INLINE ONE-SHOT MODE',
        '',
        'You are answering a single question with no follow-up turn. Constraints:',
        '- 2–3 short paragraphs maximum. No headers or lists.',
        '- Ground every claim in a specific placement, transit, or pattern from the context above. No generic astrology.',
        '- Do not ask the user a question back. There is no chat — they cannot reply.',
        '- Voice: "Your chart suggests…", "This transit is…". Never "You are X" or "You will Y".',
        '- If the question is outside what the context supports, say so plainly in one line.',
      ].join('\n'),
    })

    const model = process.env.VERCEL
      ? gateway(`anthropic/${EXPLAIN_MODEL_ID}`)
      : anthropic(EXPLAIN_MODEL_ID)

    const result = streamText({
      model,
      messages: [
        ...systemMessages,
        { role: 'user', content: prompt },
      ],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      onFinish: async ({ usage: finalUsage, providerMetadata }) => {
        const anthropicMeta = providerMetadata?.anthropic as
          | { cacheReadInputTokens?: number; cacheCreationInputTokens?: number }
          | undefined

        await recordUsage({
          userId: profileId,
          feature: 'oracle_explain',
          model: EXPLAIN_MODEL_ID,
          messages: 1,
          inputTokens: finalUsage.inputTokens ?? 0,
          inputTokensCached: anthropicMeta?.cacheReadInputTokens ?? 0,
          cacheCreationTokens: anthropicMeta?.cacheCreationInputTokens ?? 0,
          outputTokens: finalUsage.outputTokens ?? 0,
        })
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[oracle-explain] Failed to respond:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
