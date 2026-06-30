import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { TransitBadge } from '@/components/shared/TransitBadge'
import { cn } from '@/lib/utils'
import type { AspectType, EphemerisDay, MoonPhaseEvent, Planet, WeekBlueprint, ZodiacSign } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { SHORT_DAY_NAMES, getWeekDates } from './utils'

const PLANET_GLYPH: Record<Planet, string> = {
  Sun: '☉',
  Moon: '☾',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}

const ASPECT_GLYPH: Record<AspectType, string> = {
  conjunction: '☌',
  opposition: '☍',
  square: '□',
  trine: '△',
  sextile: '⚹',
}

const ASPECT_TONE: Record<AspectType, string> = {
  conjunction: 'text-leather-200',
  opposition: 'text-ember-300',
  square: 'text-ember-300',
  trine: 'text-moss-300',
  sextile: 'text-moss-300',
}

const EXACT_ORB_DEG = 0.5

type PlanetEvent =
  | { kind: 'moon-phase'; date: string; phase: MoonPhaseEvent['phase']; sign: ZodiacSign }
  | { kind: 'station'; date: string; planet: Planet; direction: 'retrograde' | 'direct' }
  | { kind: 'ingress'; date: string; planet: Planet; sign: ZodiacSign }
  | {
      kind: 'aspect'
      date: string
      planet: Planet
      aspect: AspectType
      natalPlanet: Planet
      orb: number
      rangeStart: string
      rangeEnd: string
    }

function nextIso(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function findAspectRange(
  peakDate: string,
  planet: Planet,
  aspect: AspectType,
  natalPlanet: Planet,
  dayMap: Map<string, EphemerisDay>
): { start: string; end: string } {
  const matches = (date: string) => {
    const day = dayMap.get(date)
    if (!day) return false
    return day.transits.some(
      (t) => t.planet === planet && t.aspect === aspect && t.natalPlanet === natalPlanet
    )
  }

  let start = peakDate
  while (true) {
    const prev = previousIso(start)
    if (!matches(prev)) break
    start = prev
  }

  let end = peakDate
  while (true) {
    const next = nextIso(end)
    if (!matches(next)) break
    end = next
  }

  return { start, end }
}

function formatRange(start: string, end: string, peak: string): string {
  if (start === end) return ''
  const startMonth = Number(start.slice(5, 7))
  const endMonth = Number(end.slice(5, 7))
  const startMD = `${startMonth}/${Number(start.slice(8))}`
  const endMD = `${endMonth}/${Number(end.slice(8))}`
  const peakMD = `${Number(peak.slice(5, 7))}/${Number(peak.slice(8))}`
  return `${startMD} → ${endMD} · exact ${peakMD}`
}

function previousIso(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function collectPlanetEvents(weekDates: string[], dayMap: Map<string, EphemerisDay>): PlanetEvent[] {
  const events: PlanetEvent[] = []
  const tightestAspect = new Map<string, { date: string; orb: number; planet: Planet; aspect: AspectType; natalPlanet: Planet }>()

  for (const date of weekDates) {
    const day = dayMap.get(date)
    if (!day) continue
    const prev = dayMap.get(previousIso(date))

    if (day.moonPhaseEvent) {
      events.push({
        kind: 'moon-phase',
        date,
        phase: day.moonPhaseEvent.phase,
        sign: day.moonPhaseEvent.sign,
      })
    }

    if (prev) {
      const prevSet = new Set(prev.retrogrades)
      const currSet = new Set(day.retrogrades)
      for (const planet of day.retrogrades) {
        if (!prevSet.has(planet)) {
          events.push({ kind: 'station', date, planet, direction: 'retrograde' })
        }
      }
      for (const planet of prev.retrogrades) {
        if (!currSet.has(planet)) {
          events.push({ kind: 'station', date, planet, direction: 'direct' })
        }
      }

      if (prev.sun.sign !== day.sun.sign) {
        events.push({ kind: 'ingress', date, planet: 'Sun', sign: day.sun.sign })
      }
    }

    for (const t of day.transits) {
      if (t.orb > EXACT_ORB_DEG) continue
      const key = `${t.planet}-${t.aspect}-${t.natalPlanet}`
      const existing = tightestAspect.get(key)
      if (!existing || t.orb < existing.orb) {
        tightestAspect.set(key, { date, orb: t.orb, planet: t.planet, aspect: t.aspect, natalPlanet: t.natalPlanet })
      }
    }
  }

  for (const peak of tightestAspect.values()) {
    const range = findAspectRange(peak.date, peak.planet, peak.aspect, peak.natalPlanet, dayMap)
    events.push({
      kind: 'aspect',
      date: peak.date,
      planet: peak.planet,
      aspect: peak.aspect,
      natalPlanet: peak.natalPlanet,
      orb: peak.orb,
      rangeStart: range.start,
      rangeEnd: range.end,
    })
  }

  events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return events
}

const ENERGY_STYLES: Record<string, string> = {
  push: 'border-leather-500/30 bg-leather-500/15 text-leather-200',
  rest: 'border-moss-500/30 bg-moss-500/15 text-moss-200',
  reflect: 'border-plum-400/30 bg-plum-400/15 text-plum-300',
  initiate: 'border-ember-400/30 bg-ember-400/15 text-ember-300',
}

const ENERGY_LABELS: Record<string, string> = {
  push: 'Active',
  rest: 'Passive',
  reflect: 'Reflect',
  initiate: 'Initiate',
}

const PHASE_LABELS: Record<string, string> = {
  new: 'New Moon',
  full: 'Full Moon',
  'first-quarter': 'First Quarter',
  'last-quarter': 'Last Quarter',
}

interface WeekViewProps {
  selectedDate: string
  dayMap: Map<string, EphemerisDay>
  weeks: WeekBlueprint[]
  curriculumByDate: Map<string, CurriculumSessionRow[]>
  today: string
}

function findWeekBlueprint(weeks: WeekBlueprint[], date: string): WeekBlueprint | null {
  return weeks.find((w) => w.startDate <= date && date <= w.endDate) ?? null
}

export function WeekView({ selectedDate, dayMap, weeks, curriculumByDate, today }: WeekViewProps) {
  const weekDates = getWeekDates(selectedDate)
  const weekBlueprint = findWeekBlueprint(weeks, selectedDate)
  const planetEvents = collectPlanetEvents(weekDates, dayMap)
  const weekSessions = weekDates.flatMap((date) =>
    (curriculumByDate.get(date) ?? []).map((session) => ({ ...session, scheduled_for: date }))
  )

  return (
    <div className="space-y-6">
      {weekBlueprint ? (
        <div className="shell-panel space-y-5 px-7 py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-bone-muted/70">
              Week {weekBlueprint.weekNumber}
            </span>
            <span
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider',
                ENERGY_STYLES[weekBlueprint.energyType] ?? 'border-border bg-muted text-muted-foreground'
              )}
            >
              {ENERGY_LABELS[weekBlueprint.energyType] ?? weekBlueprint.energyType}
            </span>
          </div>

          <h2 className="font-serif text-3xl leading-snug text-bone md:text-4xl">{weekBlueprint.theme}</h2>
          <p className="max-w-3xl text-base leading-8 text-bone-muted">{weekBlueprint.cosmicContext}</p>

          <ul className="space-y-2.5">
            {weekBlueprint.intentions.map((intention, i) => (
              <li key={i} className="flex gap-3 text-base text-bone">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leather-300/70" />
                <span className="leading-7">{intention}</span>
              </li>
            ))}
          </ul>

          {weekBlueprint.goalCategoryFocus.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {weekBlueprint.goalCategoryFocus.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-leather-500/30 bg-leather-500/15 px-3 py-1 text-xs uppercase tracking-wider text-leather-200"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="shell-panel flex min-h-[120px] items-center justify-center px-6 py-6">
          <p className="text-center text-base text-bone-muted">No blueprint guidance for this week.</p>
        </div>
      )}

      <div className="shell-panel overflow-hidden">
        <div className="border-b border-border/80 px-6 py-5">
          <p className="shell-kicker mb-2">Week view</p>
          <p className="text-base text-bone-muted">
            Daily transits, moon movement, and the week&apos;s blueprint guidance in one lane.
          </p>
        </div>
        <div className="overflow-x-auto">
        <div className="grid min-w-[560px] grid-cols-7 gap-px bg-border/80">
          {weekDates.map((date, i) => {
            const day = dayMap.get(date)
            const curriculumSessions = curriculumByDate.get(date) ?? []
            const isToday = date === today
            const dayNum = Number.parseInt(date.slice(8), 10)
            const showMonth = i === 0 || dayNum === 1

            return (
              <div
                key={date}
                className={cn(
                  'flex min-h-[280px] flex-col gap-2 bg-stone-900/90 px-2 py-4',
                  isToday && 'bg-leather-500/15'
                )}
              >
                <div className="mb-1 text-center">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-bone-muted/65">
                    {SHORT_DAY_NAMES[i]}
                  </div>
                  <div className={cn('text-2xl font-semibold leading-tight', isToday ? 'text-leather-200' : 'text-bone')}>
                    {dayNum}
                  </div>
                  {showMonth && <div className="text-[11px] text-bone-muted/60">{date.slice(5, 7)}/{date.slice(8)}</div>}
                </div>

                {day ? (
                  <>
                    <div className="flex flex-col items-center gap-1">
                      <MoonPhaseIcon phase={day.moon.lunarPhase} size={28} />
                      <span className="text-center text-[11px] leading-tight text-bone-muted">
                        {day.moon.degree.toFixed(0)}° <span className="text-bone-muted/80">{day.moon.sign.slice(0, 3)}</span>
                      </span>
                    </div>

                    <div className="text-center text-[11px] leading-tight text-bone-muted/75">
                      Sun {day.sun.degree.toFixed(0)}° <span className="text-bone-muted/90">{day.sun.sign.slice(0, 3)}</span>
                    </div>

                    {day.retrogrades.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1">
                        {day.retrogrades.slice(0, 3).map((planet) => (
                          <span key={planet} title={`${planet} retrograde`} className="text-[10px] font-medium leading-none text-plum-300">
                            {planet.slice(0, 2)}Rx
                          </span>
                        ))}
                      </div>
                    )}

                    {day.transits.length > 0 && (
                      <div className="mt-auto flex flex-wrap justify-center gap-1 pt-1.5">
                        {day.transits.slice(0, 2).map((t, ti) => (
                          <TransitBadge key={ti} transit={t} size="sm" />
                        ))}
                        {day.transits.length > 2 && <span className="self-center text-[10px] text-bone-muted">+{day.transits.length - 2}</span>}
                      </div>
                    )}

                    {curriculumSessions.length > 0 && (
                      <div className="mt-1 rounded-md border border-leather-400/30 bg-leather-500/15 px-1.5 py-1 text-center text-[10px] font-medium leading-tight text-leather-200">
                        {curriculumSessions.length} study session{curriculumSessions.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <span className="text-xs text-bone-muted/30">-</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        </div>
      </div>

      {(planetEvents.length > 0 || weekSessions.length > 0) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {planetEvents.length > 0 && (
            <div className="shell-panel space-y-3 px-6 py-6">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-bone-muted/65">Planet events</span>
              <ul className="space-y-3">
                {planetEvents.map((evt, i) => {
                  let icon: React.ReactNode
                  let label: React.ReactNode

                  if (evt.kind === 'moon-phase') {
                    icon = <MoonPhaseIcon phase={evt.phase} size={22} />
                    label = (
                      <>
                        {PHASE_LABELS[evt.phase] ?? evt.phase} in {evt.sign}
                      </>
                    )
                  } else if (evt.kind === 'station') {
                    icon = (
                      <span className="inline-flex h-[22px] w-[22px] items-center justify-center text-lg text-plum-300">
                        {PLANET_GLYPH[evt.planet]}
                      </span>
                    )
                    label = (
                      <>
                        {evt.planet} stations {evt.direction === 'retrograde' ? 'retrograde' : 'direct'}
                      </>
                    )
                  } else if (evt.kind === 'ingress') {
                    icon = (
                      <span className="inline-flex h-[22px] w-[22px] items-center justify-center text-lg text-leather-200">
                        {PLANET_GLYPH[evt.planet]}
                      </span>
                    )
                    label = (
                      <>
                        {evt.planet} enters {evt.sign}
                      </>
                    )
                  } else {
                    icon = (
                      <span className="inline-flex items-center gap-1 text-base">
                        <span className="text-bone">{PLANET_GLYPH[evt.planet]}</span>
                        <span className={cn('opacity-70', ASPECT_TONE[evt.aspect])}>
                          {ASPECT_GLYPH[evt.aspect]}
                        </span>
                        <span className="text-bone">{PLANET_GLYPH[evt.natalPlanet]}</span>
                      </span>
                    )
                    const rangeText = formatRange(evt.rangeStart, evt.rangeEnd, evt.date)
                    label = (
                      <span className="flex flex-col">
                        <span className="text-bone">
                          {evt.planet} {evt.aspect} natal {evt.natalPlanet}
                          <span className="ml-2 text-xs text-bone-muted/70">{evt.orb.toFixed(2)}°</span>
                        </span>
                        {rangeText ? (
                          <span className="text-xs tabular-nums text-bone-muted/65">{rangeText}</span>
                        ) : null}
                      </span>
                    )
                  }

                  const rightLabel =
                    evt.kind === 'aspect' && evt.rangeStart !== evt.rangeEnd
                      ? `${evt.rangeStart.slice(5)} → ${evt.rangeEnd.slice(5)}`
                      : evt.date.slice(5)

                  return (
                    <li key={`${evt.kind}-${evt.date}-${i}`} className="flex items-start gap-3 text-base">
                      <span className="mt-0.5">{icon}</span>
                      <span className="flex-1 text-bone">{label}</span>
                      <span className="mt-0.5 shrink-0 text-sm tabular-nums text-bone-muted">{rightLabel}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {weekSessions.length > 0 && (
            <div className="shell-panel space-y-3 px-6 py-6">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-bone-muted/65">Curriculum sessions</span>
              <ul className="space-y-3">
                {weekSessions.map((session) => (
                  <li key={session.id} className="rounded-xl border border-leather-400/25 bg-leather-500/10 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-bone">{session.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-leather-200">
                          {session.curriculum_title}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-bone-muted">
                        {session.scheduled_for.slice(5)} · {session.estimated_minutes}m
                      </span>
                    </div>
                    {session.description ? (
                      <p className="mt-2 text-sm leading-6 text-bone-muted">{session.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
