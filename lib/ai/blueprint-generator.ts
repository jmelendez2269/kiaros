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

import { createAdminSupabase } from '@/lib/supabase/admin'
import { computeNatalChart, computeYearEphemeris } from '@/lib/ephemeris'
import type { BirthData } from '@/lib/ephemeris'
import {
  computeHumanDesign,
  isHumanDesignStale,
  parseStoredHumanDesign,
  type HumanDesignChart,
} from '@/lib/human-design'
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

  // Weeks may use any day-of-week convention (Mon-Sun ISO, Sun-Sat, etc.), so
  // the first week can start up to 6 days before Jan 1 and the last week can
  // end up to 6 days after Dec 31. What we enforce is full-year coverage —
  // no gap between the boundary dates and the actual Jan 1 / Dec 31.
  const firstStart = sortedWeeks[0]?.startDate ?? ''
  const lastEnd   = sortedWeeks[sortedWeeks.length - 1]?.endDate ?? ''
  const yearStart = `${planYear}-01-01`
  const yearEnd   = `${planYear}-12-31`
  const prevDec25 = `${planYear - 1}-12-25`
  const nextJan06 = `${planYear + 1}-01-06`

  if (firstStart > yearStart) {
    throw new Error(`Blueprint weeks don't cover Jan 1 — first week starts ${firstStart}`)
  }
  if (firstStart < prevDec25) {
    throw new Error(`Blueprint first week starts implausibly early: ${firstStart}`)
  }
  if (lastEnd < yearEnd) {
    throw new Error(`Blueprint weeks don't cover Dec 31 — last week ends ${lastEnd}`)
  }
  if (lastEnd > nextJan06) {
    throw new Error(`Blueprint last week ends implausibly late: ${lastEnd}`)
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
        'display_name, birth_date, birth_time, birth_time_unknown, birth_tz, birth_lat, birth_lng, natal_chart, human_design, year_vision, word_of_year, what_to_release, study_focus, tradition, house_system'
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

    // ── 4b. Compute or load Human Design ──────────────────────────────
    // Skip when birth time is unknown — HD gates change every ~16 min, so
    // computing without a time would produce a result we deliberately don't
    // show in UI (see app/(app)/human-design/page.tsx).
    let humanDesign: HumanDesignChart | null = null
    const hasKnownBirthTime = !profile.birth_time_unknown && !!profile.birth_time
    if (hasKnownBirthTime) {
      const stored = parseStoredHumanDesign(profile.human_design)
      if (stored && !isHumanDesignStale(profile.human_design)) {
        humanDesign = stored
      } else {
        humanDesign = computeHumanDesign({
          birth_date: profile.birth_date,
          birth_time: profile.birth_time,
          birth_time_unknown: profile.birth_time_unknown,
          birth_tz: profile.birth_tz,
          birth_lat: profile.birth_lat,
          birth_lng: profile.birth_lng,
        })
        if (humanDesign) {
          await admin
            .from('user_profiles')
            .update({ human_design: humanDesign as unknown as Record<string, unknown> })
            .eq('id', userId)
        }
      }
    }
    log(`human design ${humanDesign ? `ready (${humanDesign.bodyGraph.type}, ${humanDesign.bodyGraph.profile})` : 'skipped'}`)

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
    const systemPrompt = assembleBlueprintSystemPrompt(profile.tradition ?? null)
    const userPrompt = assembleBlueprintUserPrompt({
      userName: profile.display_name ?? 'there',
      natalChart,
      humanDesign,
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
    const model = anthropic('claude-sonnet-4-6')
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
        tradition: profile.tradition ?? null,
        house_system: profile.house_system ?? null,
      })
      .eq('id', blueprintId)

    // Mark onboarding complete only after a blueprint is successfully written.
    const { error: completionError } = await admin
      .from('user_profiles')
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq('id', userId)

    if (completionError) {
      console.error('[blueprint-generator] Failed to set onboarding_completed_at:', completionError)
    }

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
