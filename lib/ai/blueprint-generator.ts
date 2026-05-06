/**
 * blueprint-generator.ts
 *
 * Orchestrates the full blueprint generation pipeline:
 *  1. Load user profile + goals from DB
 *  2. Compute natal chart (from stored data or fresh calculation)
 *  3. Compute year ephemeris (or load from cache)
 *  4. Assemble prompt
 *  5. Call Claude via AI SDK generateText (JSON mode)
 *  6. Parse + validate output
 *  7. Write result to blueprints table
 *
 * This runs inside Next.js after() — the HTTP response has already been
 * sent before this function is called.
 */

import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { gateway } from '@ai-sdk/gateway'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { computeNatalChart, computeYearEphemeris } from '@/lib/ephemeris'
import type { BirthData } from '@/lib/ephemeris'
import {
  assembleBlueprintSystemPrompt,
  assembleBlueprintUserPrompt,
} from './blueprint-system-prompt'
import type { NatalChart, YearEphemeris, BlueprintOutput } from '@/types/blueprint'

// ─── Types ────────────────────────────────────────────────────────────────

interface GenerateBlueprintOptions {
  blueprintId: string
  userId: string       // Supabase user UUID (not Clerk ID)
  planYear: number
}

function derivePlanYearStart(planYear: number): string {
  return `${planYear}-01-01`
}

function validateFullYearBlueprint(blueprint: BlueprintOutput, planYear: number) {
  if (!Array.isArray(blueprint.quarters) || blueprint.quarters.length !== 4) {
    throw new Error(`Blueprint must contain exactly 4 quarters for ${planYear}`)
  }

  const quarterNumbers = new Set(blueprint.quarters.map((quarter) => quarter.quarter))
  for (const expectedQuarter of [1, 2, 3, 4]) {
    if (!quarterNumbers.has(expectedQuarter)) {
      throw new Error(`Blueprint is missing quarter ${expectedQuarter} for ${planYear}`)
    }
  }

  if (!Array.isArray(blueprint.months) || blueprint.months.length !== 12) {
    throw new Error(`Blueprint must contain exactly 12 months for ${planYear}`)
  }

  const monthNumbers = new Set(blueprint.months.map((month) => month.month))
  for (let expectedMonth = 1; expectedMonth <= 12; expectedMonth += 1) {
    if (!monthNumbers.has(expectedMonth)) {
      throw new Error(`Blueprint is missing month ${expectedMonth} for ${planYear}`)
    }
  }

  if (!Array.isArray(blueprint.weeks) || blueprint.weeks.length === 0) {
    throw new Error(`Blueprint must contain weeks for ${planYear}`)
  }

  const sortedWeeks = [...blueprint.weeks].sort((a, b) => a.startDate.localeCompare(b.startDate))
  if (sortedWeeks[0]?.startDate !== `${planYear}-01-01`) {
    throw new Error(`Blueprint must start on ${planYear}-01-01, received ${sortedWeeks[0]?.startDate ?? 'none'}`)
  }
  if (sortedWeeks[sortedWeeks.length - 1]?.endDate !== `${planYear}-12-31`) {
    throw new Error(`Blueprint must end on ${planYear}-12-31, received ${sortedWeeks[sortedWeeks.length - 1]?.endDate ?? 'none'}`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

export async function runBlueprintGeneration(opts: GenerateBlueprintOptions): Promise<void> {
  const { blueprintId, userId, planYear } = opts
  const admin = createAdminSupabase()
  const t0 = Date.now()
  const log = (msg: string) =>
    console.log(`[blueprint-generator] ${Math.round((Date.now() - t0) / 1000)}s ${blueprintId.slice(0, 8)} — ${msg}`)
  log('started')

  try {
    // ── 1. Load user profile ──────────────────────────────────────────
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select(
        'display_name, birth_date, birth_time, birth_time_unknown, birth_tz, birth_lat, birth_lng, natal_chart, year_vision, word_of_year, what_to_release, study_focus'
      )
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      throw new Error(`Profile not found for user ${userId}`)
    }

    if (!profile.birth_date || !profile.birth_lat || !profile.birth_lng) {
      throw new Error('Birth data incomplete — cannot compute natal chart')
    }
    log('profile loaded')

    // ── 2. Load goals ─────────────────────────────────────────────────
    const { data: goals } = await admin
      .from('goal_categories')
      .select('name, description, success, icon_key, color_key, sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
    log(`goals loaded (${goals?.length ?? 0})`)

    const { data: journalPatterns } = await admin
      .from('user_pattern_insights')
      .select('pattern_type, pattern_key, sample_size, confidence, first_seen, last_seen, summary, evidence')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(12)
    log(`journal patterns loaded (${journalPatterns?.length ?? 0})`)

    const { data: oraclePlannerCaptures } = await admin
      .from('oracle_captures')
      .select('captured_text, created_at, include_in_insights')
      .eq('user_id', userId)
      .eq('include_in_planner', true)
      .order('created_at', { ascending: false })
      .limit(12)
    log(`oracle planner captures loaded (${oraclePlannerCaptures?.length ?? 0})`)

    // ── 3. Resolve plan_year and full-year date range ─────────────────
    const startDate = derivePlanYearStart(planYear)

    // ── 4. Compute or load natal chart ────────────────────────────────
    let natalChart: NatalChart

    if (profile.natal_chart && typeof profile.natal_chart === 'object') {
      natalChart = profile.natal_chart as NatalChart
    } else {
      const birthData: BirthData = {
        date: profile.birth_date,
        time: profile.birth_time ?? null,
        timezone: profile.birth_tz ?? null,
        lat: profile.birth_lat,
        lng: profile.birth_lng,
        timeUnknown: profile.birth_time_unknown ?? false,
      }
      natalChart = computeNatalChart(birthData)

      // Persist the natal chart so we don't recompute it
      await admin
        .from('user_profiles')
        .update({ natal_chart: natalChart as unknown as Record<string, unknown> })
        .eq('id', userId)
    }
    log('natal chart ready')

    // ── 5. Compute or load year ephemeris ─────────────────────────────
    let ephemeris: YearEphemeris

    const { data: cached } = await admin
      .from('ephemeris_cache')
      .select('data')
      .eq('user_id', userId)
      .eq('year', planYear)
      .maybeSingle()

    const cachedEphemeris = (cached?.data as YearEphemeris | undefined) ?? null
    const shouldRefreshEphemeris = !cachedEphemeris || cachedEphemeris.startDate !== startDate

    if (!shouldRefreshEphemeris && cachedEphemeris) {
      ephemeris = cachedEphemeris
    } else {
      ephemeris = computeYearEphemeris({
        userId,
        natalChart,
        birthDate: profile.birth_date,
        startDate,
        year: planYear,
      })

      // Refresh the cache when it's missing or does not cover the full planning year.
      await admin.from('ephemeris_cache').upsert({
        user_id: userId,
        year: planYear,
        data: ephemeris as unknown as Record<string, unknown>,
        computed_at: new Date().toISOString(),
      })
    }
    log(`ephemeris ready (${ephemeris.days.length} days, ${ephemeris.significantTransits.length} transits)`)

    // ── 6. Assemble prompt ────────────────────────────────────────────
    const systemPrompt = assembleBlueprintSystemPrompt()
    const userPrompt = assembleBlueprintUserPrompt({
      userName: profile.display_name ?? 'there',
      natalChart,
      ephemeris,
      goals: goals ?? [],
      journalPatterns: journalPatterns ?? [],
      oraclePlannerCaptures: oraclePlannerCaptures ?? [],
      yearVision: profile.year_vision ?? null,
      wordOfYear: profile.word_of_year ?? null,
      whatToRelease: profile.what_to_release ?? null,
      studyFocus: profile.study_focus ?? null,
      planYear,
      startDate,
    })

    // ── 7. Call Claude ────────────────────────────────────────────────
    // Use Vercel AI Gateway in production (OIDC auth, no hardcoded key).
    // Fall back to direct Anthropic SDK for local dev.
    const model = process.env.VERCEL
      ? gateway('anthropic/claude-sonnet-4-6')
      : anthropic('claude-sonnet-4-6')
    log(`calling Claude (systemPrompt ${systemPrompt.length}c, userPrompt ${userPrompt.length}c)`)

    const { text, usage, finishReason } = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 16000,
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(290_000), // just under the 300s function maxDuration
    })
    log(`Claude responded: finishReason=${finishReason}, output ${text.length}c, usage=${JSON.stringify(usage)}`)

    // ── 8. Parse JSON output ──────────────────────────────────────────
    let blueprint: BlueprintOutput

    // Strip any markdown code fences Claude might add
    const jsonStr = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()

    try {
      blueprint = JSON.parse(jsonStr) as BlueprintOutput
    } catch {
      throw new Error(`Blueprint JSON parse failed. Raw output (first 500 chars): ${text.slice(0, 500)}`)
    }

    // Basic validation
    if (!blueprint.yearTheme || !blueprint.yearSummary) {
      throw new Error('Blueprint missing required yearTheme or yearSummary')
    }
    validateFullYearBlueprint(blueprint, planYear)
    log(`parsed ok (${blueprint.weeks.length} weeks, ${blueprint.months?.length ?? 0} months, ${blueprint.quarters?.length ?? 0} quarters)`)

    // ── 9. Write to blueprints table ──────────────────────────────────
    await admin
      .from('blueprints')
      .update({
        status: 'ready',
        year_theme: blueprint.yearTheme,
        year_summary: blueprint.yearSummary,
        quarters: blueprint.quarters as unknown as Record<string, unknown>[],
        months: blueprint.months as unknown as Record<string, unknown>[],
        weeks: blueprint.weeks as unknown as Record<string, unknown>[],
        push_periods: blueprint.pushPeriods as unknown as Record<string, unknown>[],
        rest_periods: blueprint.restPeriods as unknown as Record<string, unknown>[],
        astrological_context: JSON.stringify({
          natalChart,
          retrogradePeriods: ephemeris.retrogradePeriods,
          significantTransits: ephemeris.significantTransits.slice(0, 50),
        }),
        generated_at: new Date().toISOString(),
        model_used: 'claude-sonnet-4-6',
      })
      .eq('id', blueprintId)

    // Mark onboarding complete only after a blueprint is successfully written.
    await admin
      .from('user_profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', userId)

    log('written to DB — done')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log(`FAILED after ${Math.round((Date.now() - t0) / 1000)}s: ${message}`)
    console.error('[blueprint-generator] Failed:', err)

    await createAdminSupabase()
      .from('blueprints')
      .update({
        status: 'error',
        error_message: message.slice(0, 1000),
      })
      .eq('id', blueprintId)
  }
}
