import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { BlueprintView } from '@/components/blueprint/BlueprintView'
import type { BlueprintOutput, MoonPhase, Tradition } from '@/types/blueprint'

const TRADITION_LABELS: Record<Tradition, string> = {
  evolutionary: 'Evolutionary Astrology',
  karmic: 'Karmic Astrology',
  psychological: 'Psychological Astrology',
  traditional: 'Traditional / Hellenistic',
  synthesis: 'Synthesis',
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function sanitizePeriodRanges(value: unknown): BlueprintOutput['pushPeriods'] {
  return asArray<Record<string, unknown>>(value).map((item) => ({
    startDate: typeof item.startDate === 'string' ? item.startDate : '',
    endDate: typeof item.endDate === 'string' ? item.endDate : '',
    reason: typeof item.reason === 'string' ? item.reason : '',
  }))
}

function sanitizeMoonPhase(value: unknown): MoonPhase {
  return value === 'new' || value === 'first-quarter' || value === 'full' || value === 'last-quarter'
    ? value
    : 'new'
}

function sanitizeMonths(value: unknown): BlueprintOutput['months'] {
  return asArray<Record<string, unknown>>(value).map((item, index) => ({
    month: typeof item.month === 'number' ? item.month : index + 1,
    name: typeof item.name === 'string' ? item.name : `Month ${index + 1}`,
    theme: typeof item.theme === 'string' ? item.theme : '',
    intentions: asStringArray(item.intentions),
    keyTransits: asStringArray(item.keyTransits),
    moonPhases: asArray<Record<string, unknown>>(item.moonPhases).map((phase) => ({
      phase: sanitizeMoonPhase(phase.phase),
      date: typeof phase.date === 'string' ? phase.date : '',
      significance: typeof phase.significance === 'string' ? phase.significance : '',
    })),
    energyArc: typeof item.energyArc === 'string' ? item.energyArc : '',
  }))
}

function sanitizeQuarters(value: unknown): BlueprintOutput['quarters'] {
  return asArray<Record<string, unknown>>(value).map((item, index) => ({
    quarter: typeof item.quarter === 'number' ? item.quarter : index + 1,
    theme: typeof item.theme === 'string' ? item.theme : `Quarter ${index + 1}`,
    intention: typeof item.intention === 'string' ? item.intention : '',
    focusAreas: asStringArray(item.focusAreas),
    cosmicHighlights: asStringArray(item.cosmicHighlights),
    pushPeriods: sanitizePeriodRanges(item.pushPeriods),
    restPeriods: sanitizePeriodRanges(item.restPeriods),
  }))
}

function sanitizeWeeks(value: unknown): BlueprintOutput['weeks'] {
  return asArray<Record<string, unknown>>(value).map((item, index) => ({
    weekNumber: typeof item.weekNumber === 'number' ? item.weekNumber : index + 1,
    startDate: typeof item.startDate === 'string' ? item.startDate : '',
    endDate: typeof item.endDate === 'string' ? item.endDate : '',
    theme: typeof item.theme === 'string' ? item.theme : '',
    intentions: asStringArray(item.intentions),
    energyType:
      item.energyType === 'push' ||
      item.energyType === 'rest' ||
      item.energyType === 'reflect' ||
      item.energyType === 'initiate'
        ? item.energyType
        : 'reflect',
    cosmicContext: typeof item.cosmicContext === 'string' ? item.cosmicContext : '',
    goalCategoryFocus: asStringArray(item.goalCategoryFocus),
  }))
}

export default async function BlueprintPage() {
  const supabase = await createServerSupabase()
  const currentYear = new Date().getFullYear()

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase
      .from('blueprints')
      .select(
        'id, plan_year, year_theme, year_summary, quarters, months, weeks, push_periods, rest_periods, tradition, house_system'
      )
      .eq('plan_year', currentYear)
      .eq('status', 'ready')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('tradition, house_system')
      .maybeSingle(),
  ])

  const needsRegeneration =
    !!row &&
    !!profile &&
    (
      (profile.tradition !== null && row.tradition !== profile.tradition) ||
      (profile.house_system !== null && row.house_system !== profile.house_system)
    )

  const currentTradition = profile?.tradition as Tradition | null

  if (!row) {
    return (
      <div className="shell-panel flex flex-col items-center justify-center space-y-5 py-24 text-center">
        <div className="text-4xl text-bone-muted">✦</div>
        <h1 className="font-serif text-3xl text-bone">No blueprint yet</h1>
        <p className="max-w-sm text-sm leading-relaxed text-bone-muted">
          Your {currentYear} blueprint hasn&apos;t been generated. Complete onboarding to create
          your personalised year plan grounded in your natal chart and real planetary transits.
        </p>
        <Link
          href="/onboarding"
          className="rounded-2xl border border-leather-400/50 bg-leather-500/35 px-5 py-3 text-sm font-semibold text-bone shadow-glow"
        >
          Complete Setup
        </Link>
      </div>
    )
  }

  const blueprint: BlueprintOutput = {
    yearTheme: row.year_theme ?? '',
    yearSummary: row.year_summary ?? '',
    quarters: sanitizeQuarters(row.quarters),
    months: sanitizeMonths(row.months),
    weeks: sanitizeWeeks(row.weeks),
    pushPeriods: sanitizePeriodRanges(row.push_periods),
    restPeriods: sanitizePeriodRanges(row.rest_periods),
  }

  return (
    <>
      {needsRegeneration && (
        <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-leather-400/40 bg-leather-500/15 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-bone">
                {row.tradition === null
                  ? 'Tradition-aware readings are now available'
                  : 'Your tradition or house system has changed'}
              </p>
              <p className="text-xs leading-relaxed text-bone-muted">
                {row.tradition === null
                  ? `Regenerate your blueprint to weave in your ${currentTradition ? TRADITION_LABELS[currentTradition] : 'chosen tradition'} lens.`
                  : `Regenerate your blueprint to reflect your ${currentTradition ? TRADITION_LABELS[currentTradition] : 'updated'} path.`}
              </p>
            </div>
            <Link
              href="/onboarding/generating"
              className="shrink-0 rounded-xl border border-leather-400/50 bg-leather-500/30 px-4 py-2 text-sm font-medium text-bone shadow-glow hover:bg-leather-500/45"
            >
              Regenerate
            </Link>
          </div>
        </div>
      )}
      <BlueprintView blueprint={blueprint} planYear={row.plan_year} />
    </>
  )
}
