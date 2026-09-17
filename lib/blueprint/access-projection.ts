import type { ArcPeriod } from '@/components/year/PushRestRibbon'
import type { BlueprintOutput, MonthBlueprint, PeriodRange } from '@/types/blueprint'
import type { BlueprintYearCapability } from '@/lib/commerce/capabilities'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 86_400_000

function validDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function overlapsWindow(
  startDate: string,
  endDate: string,
  windowStart: string,
  windowEnd: string,
): boolean {
  return (
    validDate(startDate) &&
    validDate(endDate) &&
    startDate <= endDate &&
    startDate <= windowEnd &&
    endDate >= windowStart
  )
}

function projectRanges(
  ranges: BlueprintOutput['pushPeriods'],
  windowStart: string,
  windowEnd: string,
): BlueprintOutput['pushPeriods'] {
  return ranges
    .filter((range) => overlapsWindow(range.startDate, range.endDate, windowStart, windowEnd))
    .map((range): PeriodRange => ({
      ...range,
      startDate: range.startDate < windowStart ? windowStart : range.startDate,
      endDate: range.endDate > windowEnd ? windowEnd : range.endDate,
    }))
}

function monthRange(planYear: number, month: number): { start: string; end: string } | null {
  if (!Number.isInteger(planYear) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null
  }

  const start = `${planYear}-${String(month).padStart(2, '0')}-01`
  const endDay = new Date(Date.UTC(planYear, month, 0)).getUTCDate()
  return { start, end: `${planYear}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}` }
}

function projectMonths(
  months: BlueprintOutput['months'],
  planYear: number,
  windowStart: string,
  windowEnd: string,
): BlueprintOutput['months'] {
  return months.flatMap((month): MonthBlueprint[] => {
    const range = monthRange(planYear, month.month)
    if (!range || !overlapsWindow(range.start, range.end, windowStart, windowEnd)) return []

    return [{
      ...month,
      moonPhases: month.moonPhases.filter(
        (phase) => validDate(phase.date) && phase.date >= windowStart && phase.date <= windowEnd,
      ),
    }]
  })
}

function percentageWindow(
  planYear: number,
  windowStart: string,
  windowEnd: string,
): { startPct: number; endPct: number } | null {
  const yearStart = Date.UTC(planYear, 0, 1)
  const yearEndExclusive = Date.UTC(planYear + 1, 0, 1)
  const start = Math.max(new Date(`${windowStart}T00:00:00.000Z`).getTime(), yearStart)
  const endExclusive = Math.min(
    new Date(`${windowEnd}T00:00:00.000Z`).getTime() + MS_PER_DAY,
    yearEndExclusive,
  )

  if (!Number.isFinite(start) || !Number.isFinite(endExclusive) || start >= endExclusive) return null

  const yearDuration = yearEndExclusive - yearStart
  return {
    startPct: ((start - yearStart) / yearDuration) * 100,
    endPct: ((endExclusive - yearStart) / yearDuration) * 100,
  }
}

export function projectPushRestArcForAccess(
  periods: ArcPeriod[] | null,
  planYear: number,
  capability: BlueprintYearCapability,
): ArcPeriod[] | null {
  if (periods === null || capability.access === 'full') return periods
  if (capability.access === 'none' || !capability.windowStart || !capability.windowEnd) return []

  const window = percentageWindow(planYear, capability.windowStart, capability.windowEnd)
  if (!window) return []

  return periods.flatMap((period): ArcPeriod[] => {
    const startPct = Math.max(period.startPct, window.startPct)
    const endPct = Math.min(period.endPct, window.endPct)
    return startPct < endPct ? [{ ...period, startPct, endPct }] : []
  })
}

/**
 * Removes Blueprint material outside the resolved entitlement before it can
 * cross a server boundary or enter an AI prompt. A malformed window fails
 * closed instead of returning the canonical artifact.
 */
export function projectBlueprintForAccess(
  blueprint: BlueprintOutput,
  planYear: number,
  capability: BlueprintYearCapability,
): BlueprintOutput | null {
  if (capability.access === 'none') return null
  if (capability.access === 'full') return blueprint

  const { windowStart, windowEnd } = capability
  if (!windowStart || !windowEnd || !validDate(windowStart) || !validDate(windowEnd) || windowStart > windowEnd) {
    return null
  }

  return {
    // These summarize the complete paid artifact, so windowed access does not
    // serialize them. ACCESS-03 supplies explicit locked-state UI around this.
    yearTheme: '',
    yearSummary: '',
    quarters: [],
    months: projectMonths(blueprint.months, planYear, windowStart, windowEnd),
    weeks: blueprint.weeks.filter((week) =>
      overlapsWindow(week.startDate, week.endDate, windowStart, windowEnd),
    ),
    pushPeriods: projectRanges(blueprint.pushPeriods, windowStart, windowEnd),
    restPeriods: projectRanges(blueprint.restPeriods, windowStart, windowEnd),
  }
}
