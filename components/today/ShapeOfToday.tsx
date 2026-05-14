import { K, Kicker } from '@/components/almanac'
import type { ShapeOfToday, ShapeTone } from '@/lib/today/shape-of-today'

interface Props {
  shape: ShapeOfToday
  isoWeek: number
  dayOfYear: number
}

const TONE_TO_COLOR: Record<ShapeTone['toneKey'], string> = {
  sage: K.sage,
  plum: K.plum,
  copper: K.copper,
  ember: K.ember,
  brick: K.brickHi,
}

function ToneCard({ tone }: { tone: ShapeTone }) {
  const color = TONE_TO_COLOR[tone.toneKey]
  return (
    <div
      style={{
        background: K.bg3,
        border: `1px solid ${color}44`,
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color, fontSize: 18, fontFamily: K.fSerif }}>{tone.glyph}</span>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 9,
            color: K.inkSoft,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {tone.label}
        </span>
      </div>
      <div
        style={{
          fontFamily: K.fSerif,
          fontStyle: 'italic',
          fontSize: 22,
          color: K.ink,
          lineHeight: 1,
          marginTop: 2,
        }}
      >
        {tone.value}
      </div>
      <div style={{ fontFamily: K.fBody, fontSize: 11.5, color: K.inkDim }}>{tone.note}</div>
    </div>
  )
}

export function ShapeOfTodayCards({ shape, isoWeek, dayOfYear }: Props) {
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
        <Kicker>The shape of today</Kicker>
        <div
          style={{
            fontFamily: K.fMono,
            fontSize: 10,
            color: K.inkSoft,
            letterSpacing: '0.14em',
          }}
        >
          WEEK {String(isoWeek).padStart(2, '0')} · DAY {String(dayOfYear).padStart(3, '0')}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <ToneCard tone={shape.energy} />
        <ToneCard tone={shape.voice} />
        <ToneCard tone={shape.body} />
      </div>
    </div>
  )
}
