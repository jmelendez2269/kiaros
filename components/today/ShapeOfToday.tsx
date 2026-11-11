import Link from 'next/link'
import { K, Kicker } from '@/components/almanac'
import { patternHref, timesWritten, type HomePattern } from '@/lib/insights/home'
import type { ShapeOfToday, ShapeTone } from '@/lib/today/shape-of-today'

interface Props {
  shape: ShapeOfToday
  isoWeek: number
  dayOfYear: number
  /** Moon and retrograde skies overhead today that the member has written under before. */
  writtenUnder?: HomePattern[]
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
        <span style={{ color, fontSize: 20, fontFamily: K.fSerif }}>{tone.glyph}</span>
        <span
          style={{
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: K.inkDim,
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
          fontSize: 25,
          color: K.ink,
          lineHeight: 1.05,
          marginTop: 2,
        }}
      >
        {tone.value}
      </div>
      <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.inkDim, lineHeight: 1.4 }}>{tone.note}</div>
    </div>
  )
}

export function ShapeOfTodayCards({ shape, isoWeek, dayOfYear, writtenUnder = [] }: Props) {
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
            fontSize: 11.5,
            color: K.inkDim,
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
      {writtenUnder.length ? (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${K.line}` }}>
          <div style={{ fontFamily: K.fMono, fontSize: 10.5, color: K.inkDim, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            A sky you&rsquo;ve written under before
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
            {writtenUnder.map((pattern) => (
              <li key={pattern.label} style={{ fontSize: 14, color: K.inkDim }}>
                <span aria-hidden style={{ fontFamily: K.fSerif, color: K.violetDim, marginRight: 6 }}>{pattern.glyph}</span>
                <Link href={patternHref(pattern.id)} style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 16, color: K.ink, textDecoration: 'underline', textDecorationColor: K.lineHi, textUnderlineOffset: 3 }}>
                  {pattern.label}
                </Link>
                {' · '}{timesWritten(pattern.entries)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
