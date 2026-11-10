'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { K, Kicker } from '@/components/almanac'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import {
  describeStar,
  KIND_META,
  layoutStarChart,
  linesFrom,
  monthLabel,
  monthReviewHref,
  rangeStart,
  SECTORS,
  type ChartEdge,
  type ChartNode,
  type PlacedStar,
} from '@/lib/insights/star-chart'

type Range = '30d' | 'quarter' | 'year'
type MapData = { nodes: ChartNode[]; edges: ChartEdge[]; captureCount: number; excerpts?: Record<string, { date: string; whose: 'member' | 'stelloquy'; text: string }> }

const W = 732, H = 700, CX = 366, CY = 350, R = 318

/** Seeded starfield so the background never shifts. */
const FIELD = (() => {
  let h = 13
  const rand = () => ((h = (h * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: 170 }, () => ({ x: rand() * W, y: rand() * H, r: rand() * 0.9 + 0.2, o: rand() * 0.3 + 0.08 }))
})()

/**
 * Mind map as a star chart: themes near the centre as named stars, the four
 * other kinds of tag in the outer band, lines where two came up in the same
 * Stelloquy conversation.
 */
export function StarChart({ today, patternsHref }: { today: string; patternsHref: string }) {
  const { openWith } = useStelloquy()
  const [range, setRange] = useState<Range>('year')
  const [data, setData] = useState<MapData | null>(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError('')
    const since = rangeStart(range, today)
    fetch(`/api/insights/map${since ? `?since=${since}` : ''}`, { cache: 'no-store' })
      .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? 'The mind map could not be loaded.'); return r.json() as Promise<MapData> })
      .then(d => { if (!cancelled) { setData(d); setSelectedId(null) } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'The mind map could not be loaded.') })
    return () => { cancelled = true }
  }, [range, today])

  const stars = useMemo(() => (data ? layoutStarChart(data.nodes, { cx: CX, cy: CY, radius: R - 26 }) : []), [data])
  const byId = useMemo(() => new Map(stars.map(s => [s.id, s])), [stars])
  const visible = useMemo(() => new Set(stars.map(s => s.id)), [stars])
  const edges = useMemo(() => (data?.edges ?? []).filter(e => visible.has(e.source) && visible.has(e.target)), [data, visible])
  const brightest = stars.find(s => s.kind === 'theme') ?? stars[0]
  const selected = (selectedId && byId.get(selectedId)) || brightest
  const lines = selected ? linesFrom(selected.id, edges, visible) : []
  const linked = new Set(lines.map(l => l.other))
  const themeRank = selected ? stars.filter(s => s.kind === 'theme').findIndex(s => s.id === selected.id) : -1

  const year = today.slice(0, 4)
  const ranges: Array<[Range, string]> = [['30d', 'Last 30 days'], ['quarter', 'This quarter'], ['year', `All of ${year}`]]

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div role="group" aria-label="Time range" className="flex gap-1 rounded-full p-1" style={{ background: K.bg3, border: `1px solid ${K.line}` }}>
          {ranges.map(([key, label]) => (
            <button key={key} type="button" aria-pressed={range === key} onClick={() => setRange(key)} className="rounded-full px-4 py-1.5 text-sm"
              style={{ background: range === key ? K.bg4 : 'transparent', color: range === key ? K.ink : K.inkDim }}>{label}</button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl p-4" style={{ border: '1px solid rgba(254,205,211,0.3)' }}>{error}</p>
      ) : !data ? (
        <p role="status" style={{ color: K.inkDim }}>Charting your sky…</p>
      ) : !stars.length ? (
        <div className="rounded-2xl p-8" style={{ border: `1px dashed ${K.lineHi}` }}>
          <h2 style={{ margin: 0, fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26 }}>Nothing to chart yet</h2>
          <p style={{ marginTop: 10, color: K.inkDim, lineHeight: 1.6 }}>
            {range === 'year'
              ? 'As you save Stelloquy conversations, the themes, aspects, Human Design elements and moods in them appear here as stars.'
              : 'No saved Stelloquy conversations in this stretch. Try a longer range.'}
          </p>
        </div>
      ) : (
        <section aria-label="Star chart mind map" className="grid overflow-hidden rounded-2xl lg:grid-cols-[minmax(0,1fr)_300px]" style={{ background: '#080a11', border: `1px solid ${K.line}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block' }}
            aria-label={`Star chart of ${stars.length} themes and tags from ${data.captureCount} saved conversations. ${selected ? `${selected.label} is selected.` : ''}`}>
            <defs>
              <radialGradient id="chart-disc"><stop offset="0%" stopColor="#21243a" /><stop offset="70%" stopColor="#11131e" /><stop offset="100%" stopColor="#0a0c14" /></radialGradient>
              <clipPath id="chart-clip"><circle cx={CX} cy={CY} r={R - 26} /></clipPath>
              {SECTORS.map(([kind, centre], i) => {
                const bottom = centre > 0, rr = bottom ? R - 4 : R - 10
                const a0 = ((centre - 40) * Math.PI) / 180, a1 = ((centre + 40) * Math.PI) / 180
                const [f0, f1] = bottom ? [a1, a0] : [a0, a1]
                return <path key={kind} id={`chart-arc-${i}`} fill="none"
                  d={`M${CX + Math.cos(f0) * rr} ${CY + Math.sin(f0) * rr} A ${rr} ${rr} 0 0 ${bottom ? 0 : 1} ${CX + Math.cos(f1) * rr} ${CY + Math.sin(f1) * rr}`} />
              })}
            </defs>
            <circle cx={CX} cy={CY} r={R} fill="url(#chart-disc)" stroke="rgba(227,226,237,0.18)" />
            <circle cx={CX} cy={CY} r={R - 26} fill="none" stroke="rgba(227,226,237,0.14)" />
            <g clipPath="url(#chart-clip)">{FIELD.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={K.ink} opacity={s.o} />)}</g>
            {[70, 140, 210].map(r => <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke="rgba(227,226,237,0.07)" strokeDasharray="2 4" />)}
            {Array.from({ length: 120 }, (_, i) => {
              const t = (i * 3 * Math.PI) / 180, len = i % 5 === 0 ? 9 : 4
              return <line key={i} x1={CX + Math.cos(t) * (R - 26)} y1={CY + Math.sin(t) * (R - 26)} x2={CX + Math.cos(t) * (R - 26 + len)} y2={CY + Math.sin(t) * (R - 26 + len)} stroke="rgba(227,226,237,0.25)" />
            })}
            {SECTORS.map(([kind, centre], i) => {
              const b = ((centre - 45) * Math.PI) / 180
              return (
                <g key={kind}>
                  <line x1={CX + Math.cos(b) * (R - 26)} y1={CY + Math.sin(b) * (R - 26)} x2={CX + Math.cos(b) * R} y2={CY + Math.sin(b) * R} stroke="rgba(227,226,237,0.3)" />
                  <text fill={KIND_META[kind].color} fontSize={10} letterSpacing={3} fontFamily={K.fMono}>
                    <textPath href={`#chart-arc-${i}`} startOffset="50%" textAnchor="middle">{KIND_META[kind].plural.toUpperCase()}</textPath>
                  </text>
                </g>
              )
            })}
            {edges.map(e => {
              const a = byId.get(e.source)!, b = byId.get(e.target)!
              const on = !!selected && (e.source === selected.id || e.target === selected.id)
              const themes = a.kind === 'theme' && b.kind === 'theme'
              return <line key={`${e.source}|${e.target}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? K.ink : themes ? '#c7b3f5' : '#a98aef'}
                strokeOpacity={on ? 0.7 : themes ? 0.25 : 0.12} strokeWidth={on ? 1.2 : 0.7} />
            })}
            {stars.map(s => (
              <Star key={s.id} star={s} selected={selected?.id === s.id} lit={!selected || selected.id === s.id || linked.has(s.id)} onSelect={() => setSelectedId(s.id)} />
            ))}
            <text x={CX} y={CY + 4} textAnchor="middle" fill={K.inkSoft} fontSize={12} fontFamily={K.fSerif}>✦</text>
          </svg>

          {selected ? (
            <aside className="flex flex-col gap-4 p-6 lg:border-l" style={{ borderColor: K.line }} aria-live="polite">
              <div>
                <Kicker color={K.violetDim}>{selected.id === brightest?.id ? 'Brightest star' : KIND_META[selected.kind].label}</Kicker>
                <h2 style={{ margin: '8px 0 0', fontFamily: K.fSerif, fontSize: 32, fontWeight: 500, lineHeight: 1.1 }}>{selected.label}</h2>
                <p style={{ margin: '6px 0 0', fontSize: 13.5, color: K.inkDim }}>Magnitude {selected.magnitude} · in {selected.count} of {data.captureCount} captures</p>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65 }}>
                {describeStar(selected, themeRank, data.captureCount, lines.slice(0, 2).map(l => byId.get(l.other)!.label))}
              </p>
              {lines.length ? (
                <div>
                  <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim, marginBottom: 4 }}>Lines from {selected.label}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {lines.map((l, i) => {
                      const other = byId.get(l.other)!
                      return (
                        <li key={l.other} style={{ borderTop: i ? `1px solid ${K.line}` : 'none' }}>
                          <button type="button" onClick={() => setSelectedId(other.id)} className="flex w-full items-center gap-3 py-2 text-left" style={{ fontSize: 14, color: K.ink }}>
                            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: KIND_META[other.kind].color, flex: 'none' }} />
                            <span className="flex-1">{other.label}</span>
                            <span style={{ fontFamily: K.fMono, fontSize: 11, color: K.inkDim }} aria-label={`together in ${l.weight} conversations`}>{l.weight}</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
              {selected.months?.length ? (
                <div>
                  <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim, marginBottom: 8 }}>Brightest in</div>
                  <ul className="flex flex-wrap gap-2" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {selected.months.map(m => (
                      <li key={m.month}>
                        <Link href={monthReviewHref(m.month)} aria-label={`${monthLabel(m.month)}, in ${m.count} saved conversations. Open that month in Reviews.`}
                          className="inline-block rounded-full px-3 py-1" style={{ fontFamily: K.fMono, fontSize: 11, border: `1px solid ${K.lineHi}`, color: K.ink }}>
                          {monthLabel(m.month)} · {m.count}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(() => {
                const behind = (selected.sampleCaptureIds ?? []).flatMap(id => (data.excerpts?.[id] ? [{ id, ...data.excerpts[id] }] : [])).slice(0, 3)
                if (!behind.length) return null
                return (
                  <div>
                    <div style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: K.inkDim, marginBottom: 4 }}>From your saved conversations</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {behind.map((c, i) => (
                        <li key={c.id} className="py-2" style={{ borderTop: i ? `1px solid ${K.line}` : 'none' }}>
                          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: K.ink }}>{c.text}</p>
                          <p style={{ margin: '4px 0 0', fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.08em', color: K.inkDim }}>
                            {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${c.date}T12:00:00Z`))} · {c.whose === 'member' ? 'your words' : 'Stelloquy, saved by you'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}
              <div className="mt-auto grid gap-2">
                <button type="button" className="rounded-full px-5 py-2.5 text-sm" style={{ background: K.copper, color: K.bg }}
                  onClick={() => openWith(`In my saved Stelloquy conversations, "${selected.label}" (${KIND_META[selected.kind].label.toLowerCase()}) comes up in ${selected.count} of ${data.captureCount}${lines.length ? `, most often alongside ${lines.slice(0, 3).map(l => byId.get(l.other)!.label).join(', ')}` : ''}. What do you notice about it?`)}>
                  Ask Stelloquy about {selected.label} →
                </button>
                <Link href={patternsHref} className="rounded-full px-5 py-2.5 text-center text-sm" style={{ border: `1px solid ${K.lineHi}`, color: K.ink }}>See your patterns</Link>
              </div>
            </aside>
          ) : null}
        </section>
      )}

      {data && stars.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3" style={{ fontSize: 12, color: K.inkDim }}>
          <span className="flex flex-wrap items-center gap-4">
            <span style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Magnitude</span>
            {([[10, '10+'], [7, '5 to 9'], [4, '1 to 4']] as const).map(([size, label]) => (
              <span key={label} className="flex items-center gap-1.5"><span aria-hidden style={{ width: size, height: size, borderRadius: 999, background: K.ink, opacity: size === 10 ? 1 : size === 7 ? 0.8 : 0.6 }} />{label}</span>
            ))}
          </span>
          <span style={{ fontFamily: K.fMono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{data.captureCount} {data.captureCount === 1 ? 'capture' : 'captures'}</span>
        </div>
      ) : null}
    </div>
  )
}

function Star({ star, selected, lit, onSelect }: { star: PlacedStar; selected: boolean; lit: boolean; onSelect: () => void }) {
  const color = KIND_META[star.kind].color
  const r = star.magnitude === 1 ? 5.5 : star.magnitude === 2 ? 3.8 : 2.4
  const theme = star.kind === 'theme'
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() } }
  return (
    <g role="button" tabIndex={0} aria-pressed={selected} aria-label={`${star.label}, ${KIND_META[star.kind].label.toLowerCase()}, in ${star.count} captures`}
      onClick={onSelect} onKeyDown={onKey} style={{ cursor: 'pointer', outline: 'none' }} opacity={lit ? 1 : 0.55}>
      <circle cx={star.x} cy={star.y} r={Math.max(14, r * 3.2)} fill="transparent" />
      {selected ? <circle cx={star.x} cy={star.y} r={22} fill="none" stroke="#c7b3f5" strokeDasharray="2 3" /> : null}
      <circle cx={star.x} cy={star.y} r={r * 3.2} fill={color} opacity={theme || selected ? 0.22 : 0.08} />
      <circle cx={star.x} cy={star.y} r={r} fill={theme || selected ? '#ffffff' : color} />
      {star.magnitude === 1 ? (
        <>
          <line x1={star.x - r * 3} y1={star.y} x2={star.x + r * 3} y2={star.y} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={0.7} />
          <line x1={star.x} y1={star.y - r * 3} x2={star.x} y2={star.y + r * 3} stroke="#ffffff" strokeOpacity={0.5} strokeWidth={0.7} />
        </>
      ) : null}
      <text x={star.x} y={theme ? star.y - (selected ? 30 : 14) : star.y + 16} textAnchor="middle"
        fill={theme || selected ? K.ink : K.inkDim} fontSize={theme ? 14 : 10.5} fontFamily={theme ? K.fSerif : undefined} fontStyle={theme ? 'italic' : undefined}>
        {star.label}
      </text>
    </g>
  )
}
