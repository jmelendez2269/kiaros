import { K } from '@/components/almanac/tokens'

export type ArcKind = 'push' | 'rest' | 'edit'

export interface ArcPeriod {
  kind: ArcKind
  /** percent of year, 0..100 */
  startPct: number
  endPct: number
  label: string
}

const KIND_TONE: Record<ArcKind, string> = {
  push: K.copper,
  rest: K.sage,
  edit: K.brickHi,
}

interface Props {
  periods: ArcPeriod[]
  /** percent of year for "today" marker, 0..100 */
  todayPct: number
}

export function PushRestRibbon({ periods, todayPct }: Props) {
  return (
    <div
      style={{
        position: 'relative',
        height: 32,
        background: K.bg3,
        borderRadius: 6,
        overflow: 'hidden',
        border: `1px solid ${K.line}`,
      }}
    >
      {periods.map((p, i) => {
        const tone = KIND_TONE[p.kind]
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${p.startPct}%`,
              width: `${p.endPct - p.startPct}%`,
              background: `linear-gradient(180deg, ${tone}44, ${tone}11)`,
              borderRight: i < periods.length - 1 ? `1px solid ${K.bg2}` : 'none',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 8,
              fontFamily: K.fMono,
              fontSize: 8.5,
              color: tone,
              letterSpacing: '0.14em',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {p.label}
          </div>
        )
      })}
      <div
        style={{
          position: 'absolute',
          top: -4,
          bottom: -4,
          left: `${todayPct}%`,
          width: 2,
          background: K.ink,
          boxShadow: `0 0 6px ${K.ink}`,
        }}
      />
    </div>
  )
}
