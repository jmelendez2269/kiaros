import { MoonPhaseIcon } from '@/components/shared/MoonPhaseIcon'
import { TransitBadge } from '@/components/shared/TransitBadge'
import { cn } from '@/lib/utils'
import type { EphemerisDay, WeekBlueprint } from '@/types/blueprint'
import type { CurriculumSessionRow } from '@/types/curriculum'
import { SHORT_DAY_NAMES, getWeekDates } from './utils'

const ENERGY_STYLES: Record<string, string> = {
  push: 'border-leather-500/30 bg-leather-500/15 text-leather-200',
  rest: 'border-moss-500/30 bg-moss-500/15 text-moss-200',
  reflect: 'border-plum-400/30 bg-plum-400/15 text-plum-300',
  initiate: 'border-ember-400/30 bg-ember-400/15 text-ember-300',
}

const ENERGY_LABELS: Record<string, string> = {
  push: 'Push',
  rest: 'Rest',
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
  const weekPhaseEvents = weekDates.flatMap((d) => {
    const evt = dayMap.get(d)?.moonPhaseEvent
    return evt ? [{ date: d, event: evt }] : []
  })
  const weekSessions = weekDates.flatMap((date) =>
    (curriculumByDate.get(date) ?? []).map((session) => ({ ...session, scheduled_for: date }))
  )

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="shell-panel overflow-hidden">
        <div className="border-b border-border/80 px-5 py-4">
          <p className="shell-kicker mb-2">Week view</p>
          <p className="text-sm text-bone-muted">
            Daily transits, moon movement, and the week&apos;s blueprint guidance in one lane.
          </p>
        </div>
        <div className="grid grid-cols-7 gap-px bg-border/80">
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
                  'flex min-h-[220px] flex-col gap-1.5 bg-stone-900/90 px-1.5 py-3',
                  isToday && 'bg-leather-500/15'
                )}
              >
                <div className="mb-0.5 text-center">
                  <div className="text-[9px] font-medium uppercase tracking-wider text-bone-muted/50">
                    {SHORT_DAY_NAMES[i]}
                  </div>
                  <div className={cn('text-sm font-semibold leading-tight', isToday ? 'text-leather-200' : 'text-bone')}>
                    {dayNum}
                  </div>
                  {showMonth && <div className="text-[9px] text-bone-muted/45">{date.slice(5, 7)}/{date.slice(8)}</div>}
                </div>

                {day ? (
                  <>
                    <div className="flex flex-col items-center gap-0.5">
                      <MoonPhaseIcon phase={day.moon.lunarPhase} size={16} />
                      <span className="text-center text-[8px] leading-tight text-bone-muted/70">
                        {day.moon.degree.toFixed(0)} deg <span className="text-bone-muted">{day.moon.sign.slice(0, 3)}</span>
                      </span>
                    </div>

                    <div className="text-center text-[8px] leading-tight text-bone-muted/60">
                      Sun {day.sun.degree.toFixed(0)} deg <span className="text-bone-muted/80">{day.sun.sign.slice(0, 3)}</span>
                    </div>

                    {day.retrogrades.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {day.retrogrades.slice(0, 3).map((planet) => (
                          <span key={planet} title={`${planet} retrograde`} className="text-[8px] leading-none text-plum-300">
                            {planet.slice(0, 2)}Rx
                          </span>
                        ))}
                      </div>
                    )}

                    {day.transits.length > 0 && (
                      <div className="mt-auto flex flex-wrap justify-center gap-0.5 pt-1">
                        {day.transits.slice(0, 2).map((t, ti) => (
                          <TransitBadge key={ti} transit={t} size="sm" />
                        ))}
                        {day.transits.length > 2 && <span className="self-center text-[8px] text-bone-muted">+{day.transits.length - 2}</span>}
                      </div>
                    )}

                    {curriculumSessions.length > 0 && (
                      <div className="mt-1 rounded-md border border-leather-400/20 bg-leather-500/10 px-1 py-1 text-center text-[8px] leading-tight text-leather-200">
                        {curriculumSessions.length} study session{curriculumSessions.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center">
                    <span className="text-[10px] text-bone-muted/25">-</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="shell-panel self-start space-y-4 px-5 py-5">
        {weekBlueprint ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-widest text-bone-muted/55">
                Week {weekBlueprint.weekNumber}
              </span>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  ENERGY_STYLES[weekBlueprint.energyType] ?? 'border-border bg-muted text-muted-foreground'
                )}
              >
                {ENERGY_LABELS[weekBlueprint.energyType] ?? weekBlueprint.energyType}
              </span>
            </div>

            <h3 className="font-serif text-[1.65rem] leading-snug text-bone">{weekBlueprint.theme}</h3>
            <p className="text-sm leading-7 text-bone-muted">{weekBlueprint.cosmicContext}</p>

            <ul className="space-y-2">
              {weekBlueprint.intentions.map((intention, i) => (
                <li key={i} className="flex gap-2 text-sm text-bone">
                  <span className="mt-0.5 shrink-0 text-bone-muted">-</span>
                  {intention}
                </li>
              ))}
            </ul>

            {weekBlueprint.goalCategoryFocus.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {weekBlueprint.goalCategoryFocus.map((area) => (
                  <span
                    key={area}
                    className="rounded-full border border-leather-500/20 bg-leather-500/10 px-2 py-0.5 text-[10px] text-leather-200"
                  >
                    {area}
                  </span>
                ))}
              </div>
            )}

            {weekPhaseEvents.length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <span className="text-[9px] font-medium uppercase tracking-widest text-bone-muted/45">Moon events</span>
                {weekPhaseEvents.map(({ date, event }) => (
                  <div key={date} className="flex items-center gap-2 text-sm">
                    <MoonPhaseIcon phase={event.phase} size={14} />
                    <span className="text-bone-muted">
                      {PHASE_LABELS[event.phase] ?? event.phase} in {event.sign}
                    </span>
                    <span className="ml-auto text-[10px] text-bone-muted">{date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}

            {weekSessions.length > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <span className="text-[9px] font-medium uppercase tracking-widest text-bone-muted/45">Curriculum sessions</span>
                {weekSessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-leather-400/20 bg-leather-500/10 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-bone">{session.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-leather-200">
                          {session.curriculum_title}
                        </p>
                      </div>
                      <span className="text-[10px] text-bone-muted">
                        {session.scheduled_for.slice(5)} / {session.estimated_minutes} min
                      </span>
                    </div>
                    {session.description ? (
                      <p className="mt-2 text-sm leading-6 text-bone-muted">{session.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[100px] items-center justify-center">
            <p className="text-center text-sm text-bone-muted">No blueprint guidance for this week.</p>
          </div>
        )}
      </div>
    </div>
  )
}
