import { K, Seal } from '@/components/almanac'
import type { NatalChart } from '@/types/blueprint'

const label = { fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: K.inkDim }
const ordinal = (n: number) => `${n}${[, 'st', 'nd', 'rd'][n % 10 > 3 || Math.floor(n / 10) === 1 ? 0 : n % 10] ?? 'th'}`

/** Sun, Moon and rising as seals. Rising needs a known birth time, so it is left out without one. */
export function BigThreeSeals({ natalChart, birthTimeKnown }: { natalChart: NatalChart; birthTimeKnown: boolean }) {
  const items = [
    { glyph: '☉', color: K.ember, name: `Sun · ${ordinal(natalChart.sun.house)} house`, value: `${Math.floor(natalChart.sun.degree)}° ${natalChart.sun.sign}`, show: true },
    { glyph: '☽', color: K.starlight, name: `Moon · ${ordinal(natalChart.moon.house)} house`, value: `${Math.floor(natalChart.moon.degree)}° ${natalChart.moon.sign}`, show: true },
    { glyph: 'AC', color: K.copper, name: 'Rising', value: natalChart.rising, show: birthTimeKnown },
  ].filter((i) => i.show)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
      {items.map((i) => (
        <div key={i.name} style={{ borderRadius: 16, border: `1px solid ${K.line}`, background: K.bg2, padding: 22, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Seal color={i.color} size={52}>{i.glyph}</Seal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={label}>{i.name}</span>
            <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 25, color: K.ink }}>{i.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
