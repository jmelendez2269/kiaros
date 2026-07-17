import { K } from '@/components/almanac/tokens'
import { GATE_TO_CENTER, type BodyGraph as BodyGraphData, type Center } from '@/lib/ephemeris/human-design/bodygraph'

interface Props {
  bodyGraph: BodyGraphData
  size?: number
}

type Shape = 'square' | 'diamond' | 'tri-down' | 'tri-up' | 'tri-left' | 'tri-right'

interface CenterLayout {
  id: Center
  cx: number
  cy: number
  shape: Shape
  label: string
}

function layout(cx: number): CenterLayout[] {
  return [
    { id: 'head', cx, cy: 30, shape: 'tri-down', label: 'Head' },
    { id: 'ajna', cx, cy: 88, shape: 'tri-up', label: 'Ajna' },
    { id: 'throat', cx, cy: 150, shape: 'square', label: 'Throat' },
    { id: 'g', cx, cy: 220, shape: 'diamond', label: 'G' },
    { id: 'heart', cx: cx + 56, cy: 226, shape: 'tri-left', label: 'Heart' },
    { id: 'spleen', cx: cx - 80, cy: 290, shape: 'tri-right', label: 'Spleen' },
    { id: 'sacral', cx, cy: 308, shape: 'square', label: 'Sacral' },
    { id: 'solarPlexus', cx: cx + 80, cy: 290, shape: 'tri-left', label: 'Solar' },
    { id: 'root', cx, cy: 380, shape: 'square', label: 'Root' },
  ]
}

function shapeElement(c: CenterLayout, defined: boolean) {
  const s = 36
  const fill = defined ? K.copper : 'transparent'
  const stroke = defined ? K.copperHi : K.inkSoft
  const common = { fill, stroke, strokeWidth: 1.2 }
  switch (c.shape) {
    case 'square':
      return <rect x={c.cx - s / 2} y={c.cy - s / 2} width={s} height={s} {...common} />
    case 'diamond':
      return (
        <rect
          x={c.cx - s / 2}
          y={c.cy - s / 2}
          width={s}
          height={s}
          transform={`rotate(45 ${c.cx} ${c.cy})`}
          {...common}
        />
      )
    case 'tri-down':
      return (
        <polygon
          points={`${c.cx - s / 2},${c.cy - s / 2} ${c.cx + s / 2},${c.cy - s / 2} ${c.cx},${c.cy + s / 2}`}
          {...common}
        />
      )
    case 'tri-up':
      return (
        <polygon
          points={`${c.cx - s / 2},${c.cy + s / 2} ${c.cx + s / 2},${c.cy + s / 2} ${c.cx},${c.cy - s / 2}`}
          {...common}
        />
      )
    case 'tri-left':
      return (
        <polygon
          points={`${c.cx + s / 2},${c.cy - s / 2} ${c.cx + s / 2},${c.cy + s / 2} ${c.cx - s / 2},${c.cy}`}
          {...common}
        />
      )
    case 'tri-right':
      return (
        <polygon
          points={`${c.cx - s / 2},${c.cy - s / 2} ${c.cx - s / 2},${c.cy + s / 2} ${c.cx + s / 2},${c.cy}`}
          {...common}
        />
      )
  }
}

/**
 * Simplified geometric body graph — 9 centers + activated channels, driven by
 * a real computed BodyGraph rather than placeholder data. Only channels the
 * chart actually activates are drawn; undefined centers render as outlines.
 */
export function BodyGraph({ bodyGraph, size = 280 }: Props) {
  const W = size
  const H = size * 1.5
  const scale = size / 280
  const centers = layout(140).map((c) => ({ ...c, cx: c.cx * scale, cy: c.cy * scale }))
  const findCenter = (id: Center) => centers.find((c) => c.id === id)!
  const defined = new Set(bodyGraph.definedCenters)

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {bodyGraph.activatedChannels.map((ch) => {
        const fromCenter = GATE_TO_CENTER[ch.gates[0]]
        const toCenter = GATE_TO_CENTER[ch.gates[1]]
        if (!fromCenter || !toCenter || fromCenter === toCenter) return null
        const a = findCenter(fromCenter)
        const b = findCenter(toCenter)
        return (
          <line
            key={`${ch.gates[0]}-${ch.gates[1]}`}
            x1={a.cx}
            y1={a.cy}
            x2={b.cx}
            y2={b.cy}
            stroke={K.copperHi}
            strokeWidth={4 * scale}
            opacity={0.85}
          />
        )
      })}
      {centers.map((c) => (
        <g key={c.id}>
          {shapeElement(c, defined.has(c.id))}
          <text
            x={c.cx}
            y={c.cy + 4 * scale}
            textAnchor="middle"
            fontSize={9 * scale}
            fontFamily={K.fMono}
            fill={defined.has(c.id) ? K.bg : K.inkDim}
            letterSpacing="0.12em"
          >
            {c.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  )
}
