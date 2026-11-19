import Link from 'next/link'
import { K } from '@/components/almanac/tokens'
import { MoonGlyph } from '@/components/almanac/MoonGlyph'
import { PlanChecklist } from '@/components/plan/PlanChecklist'
import type { Tables } from '@/types/database'
import type { CurriculumSessionRow } from '@/types/curriculum'
import type { EnergyWindow } from '@/lib/planetary/energy-windows'

export interface DayEvent {
  /** Day-of-month, 1-indexed */
  day: number
  tag: string
  tone: string
}

interface Props {
  year: number
  /** 0..11 */
  month: number
  today: { year: number; month: number; day: number }
  events?: DayEvent[]
  /** Day-of-month (1-indexed) values for cells that have a journal entry */
  journalDays?: Set<number>
  planItemsByDay?: Map<number, Tables<'plan_items'>[]>
  curriculumByDay?: Map<number, CurriculumSessionRow[]>
  energyByDay?: Map<number, EnergyWindow>
  /** Day-of-month values the member checked in. */
  checkedInDays?: Set<number>
  /** Day-of-month to planets retrograde that day. */
  retrogradeByDay?: Map<number, string[]>
}

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const ENERGY_TONE: Record<string, string> = {
  push: K.copper,
  initiate: K.ember,
  reflect: K.plum,
  rest: K.sage,
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function MonthGrid({
  year,
  month,
  today,
  events = [],
  journalDays,
  planItemsByDay,
  curriculumByDay,
  energyByDay,
  checkedInDays,
  retrogradeByDay,
}: Props) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = daysInMonth(year, month)
  const cellCount = Math.ceil((offset + days) / 7) * 7
  const eventByDay = new Map(events.map((e) => [e.day, e]))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1, marginBottom: 4 }}>
        {DOW.map((d, i) => (
          <div
            key={i}
            style={{
              fontFamily: K.fMono,
              fontSize: 9.5,
              color: K.inkDim,
              letterSpacing: '0.16em',
              textAlign: 'center',
              padding: '4px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1, background: K.line }}>
        {Array.from({ length: cellCount }).map((_, i) => {
          const d = i - offset + 1
          const valid = d >= 1 && d <= days
          const isToday = valid && today.year === year && today.month === month && today.day === d
          const phase = valid ? ((d - 1) / 29.5) % 1 : 0
          const event = valid ? eventByDay.get(d) : undefined
          const showMoon = valid && (d === 1 || d % 7 === 0)
          const hasJournal = valid && journalDays?.has(d) === true
          const checkedIn = valid && checkedInDays?.has(d) === true
          const retro = valid ? retrogradeByDay?.get(d) : undefined
          const planItems = valid ? planItemsByDay?.get(d) ?? [] : []
          const curriculumSessions = valid ? curriculumByDay?.get(d) ?? [] : []
          const character = valid ? energyByDay?.get(d) : undefined
          const totalCount = planItems.length + curriculumSessions.length
          const doneCount =
            planItems.filter((item) => item.completed_at).length +
            curriculumSessions.filter((session) => session.status === 'done').length

          const cellStyle: React.CSSProperties = {
            background: !valid
              ? K.bg
              : isToday
                ? `linear-gradient(180deg, ${K.copper}22, ${K.bg2})`
                : retro?.length
                  ? `linear-gradient(180deg, ${K.ember}1f, ${K.bg2})`
                  : K.bg2,
            padding: 7,
            position: 'relative',
            border: isToday ? `1px solid ${K.copper}` : 'none',
            borderRadius: isToday ? 4 : 0,
          }

          if (!valid) return <div key={i} style={{ ...cellStyle, minHeight: 96 }} />

          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          return (
            <div
              key={i}
              className="flex min-h-[96px] flex-col lg:min-h-[170px]"
              style={{
                ...cellStyle,
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Link
                  href={`/planner?date=${iso}`}
                  prefetch={false}
                  aria-label={`Open the day planner for ${iso}`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-leather-500/15"
                  style={{
                    fontFamily: K.fSerif,
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: isToday ? K.ink : K.inkDim,
                    lineHeight: 1,
                    textDecoration: 'none',
                  }}
                >
                  {d}
                </Link>
                <div className="flex items-center gap-1.5" style={{ minWidth: 0, overflow: 'hidden' }}>
                  {character ? (
                    <span
                      title={`${character.label}${character.reason ? ` · ${character.reason}` : ''}`}
                      aria-label={`${character.label} energy`}
                      className="inline-flex items-center gap-1"
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: ENERGY_TONE[character.energyType] ?? K.inkSoft,
                        }}
                      />
                      <span
                        className="hidden xl:inline"
                        style={{ fontFamily: K.fMono, fontSize: 8, color: K.inkDim }}
                      >
                        {character.label}
                      </span>
                    </span>
                  ) : null}
                  {showMoon ? <MoonGlyph phase={phase} size={11} color={K.copperHi} /> : null}
                </div>
              </div>
              {event ? (
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: K.fMono,
                    fontSize: 8.5,
                    color: event.tone,
                    letterSpacing: '0.04em',
                    borderLeft: `2px solid ${event.tone}`,
                    paddingLeft: 5,
                    lineHeight: 1.3,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {event.tag}
                </div>
              ) : null}
              {checkedIn ? (
                <span
                  title="Checked in"
                  aria-label="Checked in this day"
                  style={{ position: "absolute", bottom: 10, right: 26, width: 7, height: 7, borderRadius: 999, background: K.copper }}
                />
              ) : null}
              {hasJournal ? (
                <span
                  title="You wrote"
                  aria-label="You wrote this day"
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    right: 8,
                    fontFamily: K.fSerif,
                    fontSize: 13,
                    lineHeight: 1,
                    color: K.starlight,
                  }}
                >
                  ✎
                </span>
              ) : null}
              <div className="mt-auto hidden border-t border-border/40 pt-2 lg:block">
                <PlanChecklist
                  key={`${iso}-${planItems.map((item) => item.id).join(',')}-${curriculumSessions
                    .map((session) => session.id)
                    .join(',')}`}
                  date={iso}
                  manualItems={planItems}
                  curriculumSessions={curriculumSessions}
                  variant="compact"
                />
              </div>
              {totalCount > 0 ? (
                <span
                  className="mt-auto lg:hidden"
                  aria-label={`${doneCount} of ${totalCount} planned items complete`}
                  style={{
                    fontFamily: K.fMono,
                    fontSize: 8.5,
                    color: doneCount === totalCount ? K.sage : K.inkDim,
                  }}
                >
                  {doneCount}/{totalCount} planned
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 10, fontFamily: K.fMono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: K.inkDim }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ fontFamily: K.fSerif, color: K.starlight }}>✎</span>You wrote</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: K.copper }} />Checked in</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 14, height: 10, borderRadius: 2, background: `${K.ember}33`, border: `1px solid ${K.ember}` }} />Retrograde</span>
      </div>
    </div>
  )
}
