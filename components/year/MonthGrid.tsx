import Link from 'next/link'
import { K } from '@/components/almanac/tokens'
import { MoonGlyph } from '@/components/almanac/MoonGlyph'

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
  /** Day-of-month (1-indexed) -> plan item total/done counts */
  planCountByDay?: Map<number, { total: number; done: number }>
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function MonthGrid({ year, month, today, events = [], journalDays, planCountByDay }: Props) {
  const offset = new Date(year, month, 1).getDay()
  const days = daysInMonth(year, month)
  const cellCount = Math.ceil((offset + days) / 7) * 7
  const eventByDay = new Map(events.map((e) => [e.day, e]))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
        {DOW.map((d, i) => (
          <div
            key={i}
            style={{
              fontFamily: K.fMono,
              fontSize: 9.5,
              color: K.inkSoft,
              letterSpacing: '0.16em',
              textAlign: 'center',
              padding: '4px 0',
            }}
          >
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, background: K.line }}>
        {Array.from({ length: cellCount }).map((_, i) => {
          const d = i - offset + 1
          const valid = d >= 1 && d <= days
          const isToday = valid && today.year === year && today.month === month && today.day === d
          const phase = valid ? ((d - 1) / 29.5) % 1 : 0
          const event = valid ? eventByDay.get(d) : undefined
          const showMoon = valid && (d === 1 || d % 7 === 0)
          const hasJournal = valid && journalDays?.has(d) === true
          const planCount = valid ? planCountByDay?.get(d) : undefined

          const cellStyle: React.CSSProperties = {
            minHeight: 78,
            background: !valid
              ? K.bg
              : isToday
                ? `linear-gradient(180deg, ${K.copper}22, ${K.bg2})`
                : K.bg2,
            padding: 7,
            position: 'relative',
            border: isToday ? `1px solid ${K.copper}` : 'none',
            borderRadius: isToday ? 4 : 0,
          }

          if (!valid) return <div key={i} style={cellStyle} />

          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

          return (
            <Link
              key={i}
              href={`/year?view=week&date=${iso}`}
              prefetch={false}
              aria-label={`Open week containing ${iso}`}
              style={{
                ...cellStyle,
                display: 'block',
                color: 'inherit',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span
                  style={{
                    fontFamily: K.fSerif,
                    fontStyle: 'italic',
                    fontSize: 16,
                    color: isToday ? K.ink : K.inkDim,
                    lineHeight: 1,
                  }}
                >
                  {d}
                </span>
                {showMoon ? <MoonGlyph phase={phase} size={11} color={K.copperHi} /> : null}
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
                  }}
                >
                  {event.tag}
                </div>
              ) : null}
              {hasJournal ? (
                <span
                  title="Journal entry on this day"
                  aria-label="Journal entry on this day"
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
              {planCount && planCount.total > 0 ? (
                <span
                  title={`${planCount.done}/${planCount.total} planned`}
                  aria-label={`${planCount.done} of ${planCount.total} plan items done`}
                  style={{
                    position: 'absolute',
                    bottom: 6,
                    left: 8,
                    fontFamily: K.fMono,
                    fontSize: 8.5,
                    lineHeight: 1,
                    letterSpacing: '0.02em',
                    color: planCount.done === planCount.total ? K.sage : K.inkSoft,
                  }}
                >
                  {planCount.done}/{planCount.total}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
