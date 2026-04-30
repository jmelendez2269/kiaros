import type { CSSProperties, ReactNode } from 'react'
import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { cn } from '@/lib/utils'
import type {
  AspectType,
  EnergyType,
  EphemerisDay,
  MoonPhaseEvent,
  Planet,
  RetrogradePeriod,
  Transit,
  WeekBlueprint,
  YearEphemeris,
  ZodiacSign,
} from '@/types/blueprint'
import { MONTH_NAMES } from './utils'

interface YearViewProps {
  yearEphemeris: YearEphemeris
  weeks: WeekBlueprint[]
  onMonthClick: (month: number) => void
  onDayClick?: (date: string) => void
}

interface SunRange {
  sign: ZodiacSign
  startDate: string
  endDate: string
}

const PLANET_ROWS: Planet[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]

const PLANET_ABBREVIATIONS: Record<Planet, string> = {
  Sun: 'Su',
  Moon: 'Mo',
  Mercury: 'Me',
  Venus: 'Ve',
  Mars: 'Ma',
  Jupiter: 'Ju',
  Saturn: 'Sa',
  Uranus: 'Ur',
  Neptune: 'Ne',
  Pluto: 'Pl',
}

const ASPECT_STYLES: Record<AspectType, string> = {
  conjunction: 'border-leather-200/70 bg-leather-300 shadow-[0_0_16px_hsl(var(--leather-300)/0.32)]',
  opposition: 'border-plum-300/70 bg-plum-300 shadow-[0_0_16px_hsl(var(--plum-300)/0.28)]',
  square: 'border-ember-300/70 bg-ember-300 shadow-[0_0_16px_hsl(var(--ember-300)/0.28)]',
  trine: 'border-moss-200/70 bg-moss-300 shadow-[0_0_16px_hsl(var(--moss-300)/0.28)]',
  sextile: 'border-moss-200/70 bg-moss-400 shadow-[0_0_16px_hsl(var(--moss-400)/0.24)]',
}

const ENERGY_STYLES: Record<EnergyType, string> = {
  push: 'border-leather-300/45 bg-leather-500/45 shadow-[0_0_16px_hsl(var(--leather-400)/0.18)]',
  rest: 'border-moss-300/45 bg-moss-500/45 shadow-[0_0_16px_hsl(var(--moss-400)/0.16)]',
  reflect: 'border-plum-300/45 bg-plum-400/45 shadow-[0_0_16px_hsl(var(--plum-400)/0.16)]',
  initiate: 'border-ember-300/45 bg-ember-400/45 shadow-[0_0_16px_hsl(var(--ember-400)/0.16)]',
}

const SIGN_STYLES = [
  'border-leather-300/35 bg-leather-500/40 text-leather-200',
  'border-moss-300/35 bg-moss-500/40 text-moss-200',
  'border-plum-300/35 bg-plum-400/40 text-plum-300',
  'border-ember-300/35 bg-ember-400/40 text-ember-300',
]

const SIGN_ORDER: ZodiacSign[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

const MOON_PHASE_LABELS: Record<MoonPhaseEvent['phase'], string> = {
  new: 'New Moon',
  'first-quarter': 'First Quarter',
  full: 'Full Moon',
  'last-quarter': 'Last Quarter',
}

export function YearView({ yearEphemeris, weeks, onMonthClick, onDayClick }: YearViewProps) {
  const { year } = yearEphemeris
  const today = new Date().toISOString().slice(0, 10)
  const todayPercent = today.startsWith(String(year)) ? dateToPercent(today, year) : null
  const sunRanges = buildSunSignRanges(yearEphemeris.days)
  const retrogradesByPlanet = groupRetrogradesByPlanet(yearEphemeris.retrogradePeriods)
  const transitsByPlanet = groupTransitsByPlanet(yearEphemeris)

  return (
    <div className="shell-panel overflow-hidden">
      <div className="grid grid-cols-[72px_minmax(0,1fr)] border-b border-border/75 bg-stone-950/55 sm:grid-cols-[92px_minmax(0,1fr)]">
        <div className="flex items-center border-r border-border/70 px-2 py-3 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-bone-muted/55 sm:px-3">
          Layer
        </div>
        <div className="grid grid-cols-12">
          {MONTH_NAMES.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => onMonthClick(index + 1)}
              className="min-w-0 border-l border-border/45 px-0.5 py-3 text-center text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-bone-muted/60 transition-colors first:border-l-0 hover:bg-leather-500/10 hover:text-leather-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-leather-400/40 sm:text-[0.66rem]"
              title={name}
            >
              {name.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      <div>
        {PLANET_ROWS.map((planet) => (
          <TimelineRow
            key={planet}
            label={planet}
            abbreviation={PLANET_ABBREVIATIONS[planet]}
            todayPercent={todayPercent}
          >
            {planet === 'Sun' &&
              sunRanges.map((range) => (
                <SunSegment key={`${range.startDate}-${range.sign}`} range={range} year={year} />
              ))}

            {planet === 'Moon' &&
              yearEphemeris.moonPhases.map((phase) => (
                <MoonPhaseMarker
                  key={`${phase.date}-${phase.phase}`}
                  event={phase}
                  year={year}
                  onDayClick={onDayClick}
                />
              ))}

            {(retrogradesByPlanet.get(planet) ?? []).map((period) => (
              <RetrogradeSegment key={`${period.planet}-${period.startDate}`} period={period} year={year} />
            ))}

            {thinTransitEvents(transitsByPlanet.get(planet) ?? []).map((transit) => (
              <TransitMarker
                key={`${transit.date}-${transit.planet}-${transit.natalPlanet}-${transit.aspect}`}
                transit={transit}
                year={year}
                onDayClick={onDayClick}
              />
            ))}
          </TimelineRow>
        ))}

        {weeks.length > 0 && (
          <TimelineRow label="Plan" abbreviation="Pln" todayPercent={todayPercent}>
            {weeks.map((week) => (
              <PlanSegment key={week.weekNumber} week={week} year={year} />
            ))}
          </TimelineRow>
        )}
      </div>
    </div>
  )
}

function TimelineRow({
  label,
  abbreviation,
  todayPercent,
  children,
}: {
  label: string
  abbreviation: string
  todayPercent: number | null
  children: ReactNode
}) {
  return (
    <div className="grid min-h-[48px] grid-cols-[72px_minmax(0,1fr)] border-b border-border/55 last:border-b-0 sm:grid-cols-[92px_minmax(0,1fr)]">
      <div className="flex items-center gap-2 border-r border-border/65 bg-stone-950/35 px-2 sm:px-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-stone-900/75 text-[0.58rem] font-semibold uppercase text-bone-muted sm:h-8 sm:w-8">
          {abbreviation}
        </span>
        <span className="hidden truncate text-[0.74rem] font-medium text-bone-muted sm:block">
          {label}
        </span>
      </div>
      <div className="relative min-h-[48px] overflow-hidden bg-stone-950/25">
        <MonthGridLines />
        <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border/60" />
        {todayPercent !== null && (
          <span
            className="absolute bottom-1 top-1 z-20 w-px bg-leather-200/70 shadow-[0_0_18px_hsl(var(--leather-300)/0.55)]"
            style={{ left: `${todayPercent}%` }}
            aria-hidden
          />
        )}
        {children}
      </div>
    </div>
  )
}

function MonthGridLines() {
  return (
    <div className="pointer-events-none absolute inset-0 grid grid-cols-12">
      {MONTH_NAMES.map((name, index) => (
        <span key={name} className={cn(index > 0 && 'border-l border-border/45')} />
      ))}
    </div>
  )
}

function SunSegment({ range, year }: { range: SunRange; year: number }) {
  const signIndex = SIGN_ORDER.indexOf(range.sign)
  const tone = SIGN_STYLES[Math.max(signIndex, 0) % SIGN_STYLES.length]

  return (
    <span
      className={cn(
        'absolute top-1/2 z-10 flex h-3 -translate-y-1/2 items-center overflow-hidden rounded-full border px-1.5',
        tone
      )}
      style={rangeStyle(range.startDate, range.endDate, year)}
      title={`Sun in ${range.sign}: ${range.startDate} to ${range.endDate}`}
    >
      <span className="hidden truncate text-[0.52rem] font-semibold uppercase leading-none md:block">
        {range.sign.slice(0, 3)}
      </span>
    </span>
  )
}

function RetrogradeSegment({ period, year }: { period: RetrogradePeriod; year: number }) {
  return (
    <span
      className="absolute top-1/2 z-30 h-3 -translate-y-1/2 rounded-full border border-plum-300/55 bg-plum-400/45 shadow-[0_0_16px_hsl(var(--plum-400)/0.24)]"
      style={rangeStyle(period.startDate, period.endDate, year)}
      title={`${period.planet} retrograde: ${period.startDate} to ${period.endDate}`}
    >
      <span className="absolute -top-3 left-1 hidden text-[0.48rem] font-semibold uppercase leading-none text-plum-300 md:block">
        Rx
      </span>
    </span>
  )
}

function MoonPhaseMarker({
  event,
  year,
  onDayClick,
}: {
  event: MoonPhaseEvent
  year: number
  onDayClick?: (date: string) => void
}) {
  const marker = (
    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-bone/20 bg-stone-950/90 shadow-[0_0_14px_rgba(240,238,232,0.18)]">
      <MoonPhaseIcon phase={event.phase} size={13} />
    </span>
  )
  const label = `${MOON_PHASE_LABELS[event.phase]} in ${event.sign} on ${event.date}`

  if (onDayClick) {
    return (
      <button
        type="button"
        onClick={() => onDayClick(event.date)}
        className="absolute top-1/2 z-40 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leather-400/45"
        style={markerStyle(event.date, year)}
        aria-label={label}
        title={label}
      >
        {marker}
      </button>
    )
  }

  return (
    <span
      className="absolute top-1/2 z-40 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={markerStyle(event.date, year)}
      title={label}
    >
      {marker}
    </span>
  )
}

function TransitMarker({
  transit,
  year,
  onDayClick,
}: {
  transit: Transit
  year: number
  onDayClick?: (date: string) => void
}) {
  const label = `${transit.planet} ${formatAspect(transit.aspect)} natal ${transit.natalPlanet} on ${transit.date}`
  const dot = (
    <span
      className={cn(
        'block h-2.5 w-2.5 rounded-full border',
        ASPECT_STYLES[transit.aspect]
      )}
    />
  )

  if (onDayClick) {
    return (
      <button
        type="button"
        onClick={() => onDayClick(transit.date)}
        className="absolute top-1/2 z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-300/45"
        style={markerStyle(transit.date, year)}
        aria-label={label}
        title={label}
      >
        {dot}
      </button>
    )
  }

  return (
    <span
      className="absolute top-1/2 z-30 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={markerStyle(transit.date, year)}
      title={label}
    >
      {dot}
    </span>
  )
}

function PlanSegment({ week, year }: { week: WeekBlueprint; year: number }) {
  return (
    <span
      className={cn(
        'absolute top-1/2 z-20 h-2.5 -translate-y-1/2 rounded-full border',
        ENERGY_STYLES[week.energyType]
      )}
      style={rangeStyle(week.startDate, week.endDate, year)}
      title={`Week ${week.weekNumber}: ${week.theme}`}
    />
  )
}

function buildSunSignRanges(days: EphemerisDay[]): SunRange[] {
  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const ranges: SunRange[] = []
  let current: SunRange | null = null

  for (const day of sortedDays) {
    if (!current) {
      current = { sign: day.sun.sign, startDate: day.date, endDate: day.date }
      continue
    }

    if (day.sun.sign !== current.sign) {
      ranges.push(current)
      current = { sign: day.sun.sign, startDate: day.date, endDate: day.date }
    } else {
      current.endDate = day.date
    }
  }

  if (current) ranges.push(current)
  return ranges
}

function groupRetrogradesByPlanet(periods: RetrogradePeriod[]): Map<Planet, RetrogradePeriod[]> {
  const map = new Map<Planet, RetrogradePeriod[]>()

  for (const period of periods) {
    const current = map.get(period.planet) ?? []
    current.push(period)
    map.set(period.planet, current)
  }

  return map
}

function groupTransitsByPlanet(ephemeris: YearEphemeris): Map<Planet, Transit[]> {
  const source = ephemeris.significantTransits.length > 0
    ? ephemeris.significantTransits
    : ephemeris.days.flatMap((day) => day.transits)
  const seen = new Set<string>()
  const map = new Map<Planet, Transit[]>()

  for (const transit of source) {
    const key = `${transit.date}-${transit.planet}-${transit.natalPlanet}-${transit.aspect}`
    if (seen.has(key)) continue
    seen.add(key)

    const current = map.get(transit.planet) ?? []
    current.push(transit)
    map.set(transit.planet, current)
  }

  for (const [planet, events] of map.entries()) {
    map.set(planet, events.sort((a, b) => a.date.localeCompare(b.date)))
  }

  return map
}

function thinTransitEvents(events: Transit[], maxEvents = 24): Transit[] {
  if (events.length <= maxEvents) return events

  const step = Math.ceil(events.length / maxEvents)
  return events.filter((_, index) => index % step === 0).slice(0, maxEvents)
}

function formatAspect(aspect: AspectType): string {
  return aspect.replace('-', ' ')
}

function markerStyle(date: string, year: number): CSSProperties {
  return { left: `${dateToPercent(date, year)}%` }
}

function rangeStyle(startDate: string, endDate: string, year: number): CSSProperties {
  const left = dateToPercent(startDate, year)
  const right = dateToPercent(endDate, year)
  const width = Math.min(100 - left, Math.max(right - left, 0.7))

  return {
    left: `${left}%`,
    width: `${width}%`,
  }
}

function dateToPercent(date: string, year: number): number {
  const index = dateToDayIndex(date, year)
  const denominator = daysInYear(year) - 1

  return denominator > 0 ? (index / denominator) * 100 : 0
}

function dateToDayIndex(date: string, year: number): number {
  const [dateYear, month, day] = date.split('-').map(Number)
  if (!dateYear || !month || !day) return 0

  const start = Date.UTC(year, 0, 1)
  const value = Date.UTC(dateYear, month - 1, day)
  const rawIndex = Math.round((value - start) / 86_400_000)

  return Math.min(Math.max(rawIndex, 0), daysInYear(year) - 1)
}

function daysInYear(year: number): number {
  return new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 366 : 365
}
