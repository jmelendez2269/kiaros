import { K, Kicker, MoonGlyph } from '@/components/almanac'
import type { TodayContext } from '@/lib/today/get-today-context'

interface Props {
  week: TodayContext['week']
}

function rangeLabel(week: TodayContext['week']): string {
  if (week.length === 0) return ''
  const first = new Date(`${week[0].date}T12:00:00`)
  const last = new Date(`${week[week.length - 1].date}T12:00:00`)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${first.toLocaleDateString('en-US', opts)} — ${last.toLocaleDateString('en-US', opts)}`
}

// Compact descriptor of each day. Keep these short — they ride above the
// moon glyph in the cell. Lunar phase names compress for the strip.
function phaseHint(phase: TodayContext['week'][number]['moonPhase']): string {
  switch (phase) {
    case 'new':
      return 'seed'
    case 'waxing-crescent':
      return 'tend'
    case 'first-quarter':
      return 'commit'
    case 'waxing-gibbous':
      return 'refine'
    case 'full':
      return 'reveal'
    case 'waning-gibbous':
      return 'release'
    case 'last-quarter':
      return 'cull'
    case 'waning-crescent':
      return 'rest'
  }
}

export function WeekRibbon({ week }: Props) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <Kicker>The week ahead</Kicker>
        <div
          style={{
            fontFamily: K.fMono,
            fontSize: 11.5,
            color: K.inkSoft,
            letterSpacing: '0.14em',
          }}
        >
          {rangeLabel(week).toUpperCase()}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {week.map((day) => {
          const hot = day.moonPhase === 'full' || day.moonPhase === 'new'
          return (
            <div
              key={day.date}
              style={{
                border: `1px solid ${day.isToday ? K.copper : K.line}`,
                background: day.isToday
                  ? `linear-gradient(180deg, ${K.copper}28, ${K.bg3})`
                  : K.bg3,
                borderRadius: 10,
                padding: '10px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontFamily: K.fMono,
                  fontSize: 10.5,
                  color: K.inkSoft,
                  letterSpacing: '0.16em',
                }}
              >
                {day.shortLabel}
              </div>
              <div
                style={{
                  fontFamily: K.fSerif,
                  fontStyle: 'italic',
                  fontSize: 27,
                  color: day.isToday ? K.ink : K.inkDim,
                  lineHeight: 1,
                }}
              >
                {day.dayNumber}
              </div>
              <MoonGlyph
                phase={day.moonIllumination}
                size={16}
                color={hot ? K.copperHi : K.inkDim}
              />
              <div
                style={{
                  fontFamily: K.fBody,
                  fontSize: 12,
                  color: day.isToday ? K.copperHi : K.inkSoft,
                  fontStyle: 'italic',
                }}
              >
                {day.isToday ? 'today' : phaseHint(day.moonPhase)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
