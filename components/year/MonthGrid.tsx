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
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function MonthGrid({ year, month, today, events = [] }: Props) {
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

          return (
            <div
              key={i}
              style={{
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
              }}
            >
              {valid && (
                <>
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
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
