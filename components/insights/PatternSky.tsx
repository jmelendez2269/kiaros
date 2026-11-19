import { K } from '@/components/almanac'
import {
  layoutConstellations,
  patternGlyph,
  patternTitle,
  toRuns,
  TYPE_COLOR,
  yearFraction,
} from '@/lib/insights/pattern-sky'

export interface SkyPattern {
  id: string
  type: string
  key: string
  /** Evidence entry dates, any order. */
  dates: string[]
  /** Entries behind the pattern (the evidence list may be shorter). */
  count: number
  forming: boolean
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Seeded starfield so the background never shifts between renders. */
function starfield(width: number, height: number, count: number) {
  let h = 7
  const rand = () => ((h = (h * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: count }, () => ({ x: rand() * width, y: rand() * height, r: rand() * 0.9 + 0.2, o: rand() * 0.35 + 0.1 }))
}

/**
 * Each pattern is a constellation: one star per entry written under that sky,
 * joined in the order they were written. Bright ones have enough evidence to
 * trust; dotted ones are still forming.
 */
export function PatternConstellations({ patterns, hrefBase = '' }: { patterns: SkyPattern[]; /** Page the pattern anchors live on, when it is not this one. */ hrefBase?: string }) {
  const shown = patterns.slice(0, 8)
  if (!shown.length) return null
  const W = 1000, H = shown.length > 4 ? 380 : 300
  const layout = layoutConstellations(shown.map(p => ({ id: p.id, stars: p.dates.length })), W, H)
  const strongest = shown.find(p => !p.forming)?.id
  return (
    <section aria-label="Your patterns as constellations" className="overflow-hidden rounded-2xl" style={{ background: `radial-gradient(90% 120% at 30% 20%, #5a3eba22, transparent 60%), ${K.bg2}`, border: `1px solid ${K.line}` }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${shown.length} patterns drawn as constellations`} style={{ display: 'block' }}>
        <defs>
          <radialGradient id="pattern-glow">
            <stop offset="0%" stopColor="#a98aef" stopOpacity={0.32} />
            <stop offset="100%" stopColor="#a98aef" stopOpacity={0} />
          </radialGradient>
        </defs>
        {starfield(W, H, 110).map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={K.ink} opacity={s.o} />)}
        {shown.map(p => {
          const { stars } = layout[p.id]
          const color = TYPE_COLOR[p.type] ?? K.copper
          const dated = [...p.dates].sort().slice(-stars.length)
          const minX = Math.min(...stars.map(s => s.x)), minY = Math.min(...stars.map(s => s.y))
          const labelX = Math.max(8, Math.min(minX - 6, W - 230)), labelY = Math.max(22, minY - 30)
          return (
            <a key={p.id} href={`${hrefBase}#pattern-${p.id}`} aria-label={`${patternTitle(p.type, p.key)}, ${p.count} entries${p.forming ? ', still forming' : ''}`}>
              {p.id === strongest ? <circle cx={stars.reduce((t, s) => t + s.x, 0) / stars.length} cy={stars.reduce((t, s) => t + s.y, 0) / stars.length} r={120} fill="url(#pattern-glow)" /> : null}
              <polyline points={stars.map(s => `${s.x},${s.y}`).join(' ')} fill="none" stroke={color}
                strokeOpacity={p.forming ? 0.45 : 0.7} strokeWidth={1} strokeDasharray={p.forming ? '2 4' : undefined} />
              {stars.map((s, i) => {
                const newest = i === stars.length - 1
                return (
                  <g key={i}>
                    <title>{dated[i] ?? ''}</title>
                    <circle cx={s.x} cy={s.y} r={newest ? 4.2 : 2.6} fill={p.forming ? color : K.ink} opacity={p.forming ? 0.6 : 0.95} />
                    {newest && !p.forming ? <circle cx={s.x} cy={s.y} r={8} fill="none" stroke={color} strokeOpacity={0.4} /> : null}
                  </g>
                )
              })}
              <text x={labelX} y={labelY} fill={K.ink} fontSize={15} fontFamily={K.fSerif} fontStyle="italic">
                {patternGlyph(p.type, p.key)} {patternTitle(p.type, p.key)}
              </text>
              <text x={labelX} y={labelY + 14} fill={K.inkDim} fontSize={8.5} letterSpacing={1.3} fontFamily={K.fMono}>
                {`${p.count} ${p.count === 1 ? 'ENTRY' : 'ENTRIES'}${p.forming ? ' · FORMING' : ''}`}
              </text>
            </a>
          )
        })}
      </svg>
    </section>
  )
}

/**
 * One pattern across a year: the soft band is when that sky was overhead,
 * the bright marks are the days you wrote under it.
 */
export function YearStrip({ year, entryDates, skyDates, color, today, height = 22, label }: {
  year: number
  entryDates: string[]
  skyDates: string[]
  color: string
  today?: string
  height?: number
  label: string
}) {
  const inYear = (d: string) => d.slice(0, 4) === String(year)
  const marks = [...new Set(entryDates.filter(inYear).map(d => d.slice(0, 10)))]
  const runs = toRuns(skyDates.filter(inYear))
  const todayX = today && inYear(today) ? yearFraction(today, year) * 1000 : null
  return (
    <svg viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" width="100%" height={height} role="img"
      aria-label={`${label}: ${marks.length} ${marks.length === 1 ? 'day' : 'days'} written under this sky in ${year}`} style={{ display: 'block' }}>
      <rect x={0} y={height / 2 - 1} width={1000} height={2} fill={K.line} />
      {runs.map(([a, b]) => {
        const x0 = yearFraction(a, year) * 1000, x1 = yearFraction(b, year) * 1000 + 1000 / 365
        return <rect key={a} x={x0} y={height * 0.22} width={Math.max(2, x1 - x0)} height={height * 0.56} rx={1} fill={color} opacity={0.3} />
      })}
      {marks.map(d => <rect key={d} x={yearFraction(d, year) * 1000 - 2} y={0} width={4} height={height} rx={1} fill={color} />)}
      {todayX !== null ? <rect x={todayX} y={0} width={1.5} height={height} fill={K.inkDim} opacity={0.5} /> : null}
    </svg>
  )
}

export function StripLegend({ color }: { color: string }) {
  return (
    <span className="flex flex-wrap gap-4" style={{ fontFamily: K.fMono, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim }}>
      <span><span aria-hidden style={{ display: 'inline-block', width: 4, height: 10, background: color, marginRight: 6, verticalAlign: 'middle' }} />You wrote</span>
      <span><span aria-hidden style={{ display: 'inline-block', width: 14, height: 8, background: color, opacity: 0.25, marginRight: 6, verticalAlign: 'middle' }} />Sky present</span>
    </span>
  )
}

/** Every pattern on its own row across the year. */
export function PatternYearStrips({ patterns, year, today, skyDaysByPatternId }: {
  patterns: SkyPattern[]
  year: number
  today: string
  skyDaysByPatternId: Record<string, string[]>
}) {
  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[minmax(0,220px)_1fr_40px] items-end gap-4 sm:grid">
        <StripLegend color={K.copper} />
        <div className="grid grid-cols-12" style={{ fontFamily: K.fMono, fontSize: 9.5, letterSpacing: '0.12em', color: K.inkDim }}>
          {MONTHS.map(m => <span key={m}>{m.toUpperCase()}</span>)}
        </div>
        <span style={{ fontFamily: K.fMono, fontSize: 9.5, letterSpacing: '0.12em', color: K.inkDim, textAlign: 'right' }}>ENTRIES</span>
      </div>
      <ul className="divide-y" style={{ listStyle: 'none', padding: 0, margin: 0, borderColor: K.line }}>
        {patterns.map(p => {
          const color = TYPE_COLOR[p.type] ?? K.copper
          return (
            <li key={p.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,220px)_1fr_40px] sm:items-center sm:gap-4" style={{ borderColor: K.line }}>
              <a href={`#pattern-${p.id}`} className="flex min-w-0 items-center gap-3" style={{ color: K.ink }}>
                <span aria-hidden style={{ fontFamily: K.fSerif, fontSize: 16, width: 26, textAlign: 'center', color, flex: 'none' }}>{patternGlyph(p.type, p.key)}</span>
                <span className="min-w-0">
                  <span className="block truncate" style={{ fontSize: 14.5 }}>{patternTitle(p.type, p.key)}</span>
                  {p.forming ? <span style={{ fontFamily: K.fMono, fontSize: 9, letterSpacing: '0.14em', color: K.inkDim }}>FORMING</span> : null}
                </span>
              </a>
              <YearStrip year={year} entryDates={p.dates} skyDates={skyDaysByPatternId[p.id] ?? []} color={color} today={today} label={patternTitle(p.type, p.key)} />
              <span className="hidden text-right sm:block" style={{ fontFamily: K.fSerif, fontSize: 20 }}>{p.count}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
