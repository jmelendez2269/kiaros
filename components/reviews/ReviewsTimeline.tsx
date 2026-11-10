'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { K, Kicker } from '@/components/almanac'
import { usePeriodReview } from '@/components/period-review/PeriodReviewProvider'
import {
  dayOfYear,
  daysInYear,
  monthName,
  packRows,
  shortDay,
  skyForMonth,
  weekRangeLabel,
  weekReflectionHref,
  weeksForMonth,
  type ReviewState,
  type TimelineMonth,
  type TimelineSkyEvent,
  type TimelineWeek,
  type YearTimeline,
} from '@/lib/reviews/year-timeline'

type View = 'year' | 'list'
const VIEW_KEY = 'kairos-reviews-view'

const VIOLET = '#a98aef', VIOLET_HI = '#c7b3f5', RETRO = '#c1dcef', INK_SOFT = '#6e6d7c'

const mono = (size = 10, color: string = K.inkDim): CSSProperties => ({
  fontFamily: K.fMono, fontSize: size, letterSpacing: '0.14em', textTransform: 'uppercase', color,
})

function stateLabel(state: ReviewState, closesOn: string): string {
  if (state === 'read') return 'Read'
  if (state === 'ready') return 'Ready to read'
  if (state === 'open') return `Closes ${closesOn}`
  return 'Not yet'
}

/**
 * Reviews, one year at a time. Year view: the whole year on one line with the
 * sky underneath. List view: month by month down a spine, the sky beside each.
 */
export function ReviewsTimeline({ timeline }: { timeline: YearTimeline }) {
  const router = useRouter()
  const { openPeriodReview, statusNonce } = usePeriodReview()
  const [view, setView] = useState<View>('year')
  const firstNonce = useRef(statusNonce)

  // Phones start on the list; a member's own choice wins after that.
  useEffect(() => {
    let saved: string | null = null
    try { saved = window.localStorage.getItem(VIEW_KEY) } catch {}
    if (saved === 'year' || saved === 'list') setView(saved)
    else if (window.matchMedia('(max-width: 767px)').matches) setView('list')
  }, [])
  // A look back written or opened in the modal changes which months are read.
  useEffect(() => {
    if (statusNonce !== firstNonce.current) router.refresh()
  }, [statusNonce, router])

  function choose(next: View) {
    setView(next)
    try { window.localStorage.setItem(VIEW_KEY, next) } catch {}
  }
  const openMonth = (m: TimelineMonth) => { if (m.state === 'read' || m.state === 'ready') openPeriodReview('month', timeline.year, m.index) }
  const openQuarter = (index: number) => openPeriodReview('quarter', timeline.year, index)

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="View" className="flex gap-1 rounded-full p-1" style={{ background: K.bg3, border: `1px solid ${K.line}` }}>
          {(['year', 'list'] as const).map(v => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => choose(v)}
              className="rounded-full px-4 py-1.5 text-sm transition"
              style={{ background: view === v ? K.bg4 : 'transparent', color: view === v ? K.ink : K.inkDim }}>
              {v === 'year' ? 'Year' : 'List'}
            </button>
          ))}
        </div>
        {timeline.years.length > 1 ? (
          <nav aria-label="Year" className="flex gap-1 rounded-full p-1" style={{ background: K.bg3, border: `1px solid ${K.line}` }}>
            {timeline.years.map(y => (
              <Link key={y} href={`/reviews?year=${y}`} aria-current={y === timeline.year ? 'page' : undefined}
                className="rounded-full px-4 py-1.5 text-sm"
                style={{ background: y === timeline.year ? K.bg4 : 'transparent', color: y === timeline.year ? K.ink : K.inkDim }}>
                {y}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
      {view === 'year'
        ? <YearView timeline={timeline} openMonth={openMonth} openQuarter={openQuarter} />
        : <ListView timeline={timeline} openMonth={openMonth} openQuarter={openQuarter} />}
    </div>
  )
}

type ViewProps = { timeline: YearTimeline; openMonth: (m: TimelineMonth) => void; openQuarter: (index: number) => void }

/* ───────────────────────── Year view: the sky river ───────────────────────── */

const W = 1032, R = 916

function YearView({ timeline, openMonth, openQuarter }: ViewProps) {
  const { year, today, months, quarters, weeks, sky } = timeline
  // The week that most recently closed, while it is still the latest one.
  const lastWeek = [...weeks].reverse().find(w => w.state === 'read' || w.state === 'ready')
  const ended = months.filter(m => m.state === 'read' || m.state === 'ready')
  const [selected, setSelected] = useState<number>(ended.at(-1)?.index ?? months.find(m => m.state === 'open')?.index ?? 1)
  const length = daysInYear(year)
  const x = (date: string) => ((Math.min(Math.max(dayOfYear(date), 1), length + 1) - 1) / length) * R
  const clampStart = (d: string) => (d < `${year}-01-01` ? `${year}-01-01` : d)
  const clampEnd = (d: string) => (d > `${year}-12-31` ? `${year}-12-31` : d)

  const retro = sky.filter(e => e.kind === 'retrograde')
  const points = sky.filter(e => e.kind === 'eclipse' || e.kind === 'ingress')
  const personal = sky.filter(e => e.kind === 'personal_transit')
  const retroRows = packRows(retro.map(e => ({ id: e.id, start: clampStart(e.start), end: clampEnd(e.end) })), 6)
  const personalRows = packRows(personal.map(e => ({ id: e.id, start: clampStart(e.start), end: clampEnd(e.end) })), 40)
  const retroCount = Math.max(1, ...Object.values(retroRows).map(r => r + 1))
  const personalCount = Math.max(0, ...Object.values(personalRows).map(r => r + 1))

  const RETRO_ROW = 26
  const SKY_TOP = 196, RETRO_Y = 226, POINT_Y = RETRO_Y + retroCount * RETRO_ROW + 14, PERSONAL_Y = POINT_Y + 48
  const H = PERSONAL_Y + personalCount * 32 + 34
  const isThisYear = today.slice(0, 4) === String(year)
  const todayX = isThisYear ? x(today) : null

  const sel = months[selected - 1]
  const selSky = skyForMonth(sky, sel, false)
  const waiting: Array<{ key: string; title: string; sub: string; order: string; onOpen?: () => void; href?: string }> = [
    ...months.filter(m => m.state === 'ready').map(m => ({ key: `m${m.index}`, title: monthName(m.index), sub: m.line, order: m.end, onOpen: () => openMonth(m) })),
    ...quarters.filter(q => q.state === 'ready').map(q => ({ key: `q${q.index}`, title: `Q${q.index} · ${monthName(q.index * 3 - 2)} to ${monthName(q.index * 3)}`, sub: 'Three months together', order: q.end + 'z', onOpen: () => openQuarter(q.index) })),
    ...(isThisYear && lastWeek ? [{ key: `w${lastWeek.start}`, title: `Last week · ${weekRangeLabel(lastWeek)}`, sub: lastWeek.line ?? 'The sky you moved through, and whatever you shared.', order: lastWeek.end, href: weekReflectionHref(lastWeek) }] : []),
  ].sort((a, b) => b.order.localeCompare(a.order))

  const onKey = (m: TimelineMonth) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(m.index) } }

  return (
    <>
      <section aria-label={`${year} at a glance`} className="rounded-2xl p-4 sm:p-6" style={{ background: K.bg2, border: `1px solid ${K.line}` }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <ul className="flex flex-wrap gap-x-4 gap-y-1" style={{ ...mono(9.5), listStyle: 'none', padding: 0, margin: 0 }}>
            <li><Dot fill={VIOLET} /> Ready</li>
            <li><Dot ring={VIOLET} /> Read</li>
            <li><Dot fill={RETRO} /> Retrograde</li>
            <li><span aria-hidden style={{ display: 'inline-block', width: 7, height: 7, background: K.ember, transform: 'rotate(45deg)', marginRight: 6 }} />Eclipse</li>
            <li><span aria-hidden style={{ display: 'inline-block', width: 14, height: 4, borderRadius: 2, background: K.brickHi, marginRight: 6, verticalAlign: 'middle' }} />Transit to your chart</li>
          </ul>
          {isThisYear ? <span style={mono(9.5)}>Day {dayOfYear(today)} of {length}</span> : null}
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 720, display: 'block' }} role="img"
            aria-label={`Timeline of ${year}: month and quarter reviews, the sky, and Unwrapped at the end of the year`}>
            {/* Quarter bands */}
            {quarters.map(q => {
              const x0 = x(q.start), x1 = x(q.end) + R / length
              const ready = q.state === 'ready'
              const clickable = q.state === 'read' || ready
              return (
                <g key={q.index} onClick={clickable ? () => openQuarter(q.index) : undefined} style={{ cursor: clickable ? 'pointer' : 'default' }}>
                  <rect x={x0 + 2} y={0} width={x1 - x0 - 4} height={34} rx={8}
                    fill={ready ? '#a98aef22' : K.bg3} stroke={ready ? '#a98aef88' : K.line} strokeDasharray={q.state === 'open' ? '4 4' : undefined} />
                  <text x={x0 + 16} y={22} fill={K.ink} fontSize={14} fontFamily={K.fSerif} fontStyle="italic">Q{q.index}</text>
                  <text x={x1 - 14} y={21} fill={ready ? VIOLET_HI : K.inkDim} fontSize={9.5} textAnchor="end" letterSpacing={1.4} fontFamily={K.fMono}>
                    {stateLabel(q.state, shortDay(q.end)).toUpperCase()}
                  </text>
                </g>
              )
            })}
            {/* Months */}
            {months.map(m => {
              const x0 = x(m.start), x1 = x(m.end) + R / length, cx = (x0 + x1) / 2
              const isSel = m.index === selected
              return (
                <g key={m.index} role="button" tabIndex={0} aria-label={`${monthName(m.index)}: ${stateLabel(m.state, shortDay(m.end))}, ${m.daysWritten} days written`}
                  aria-pressed={isSel} onClick={() => setSelected(m.index)} onKeyDown={onKey(m)} style={{ cursor: 'pointer', outline: 'none' }}>
                  <rect x={x0 + 3} y={48} width={x1 - x0 - 6} height={H - 70} rx={10}
                    fill={isSel ? '#a98aef0d' : 'transparent'} stroke={isSel ? '#a98aef55' : 'transparent'} />
                  {m.index > 1 ? <line x1={x0} y1={52} x2={x0} y2={H - 26} stroke="rgba(227,226,237,0.06)" /> : null}
                  <text x={cx} y={66} fill={m.state === 'future' ? INK_SOFT : K.inkDim} fontSize={10} textAnchor="middle" letterSpacing={1.6} fontFamily={K.fMono}>
                    {monthName(m.index).slice(0, 3).toUpperCase()}
                  </text>
                  {m.state === 'ready' ? (<><circle cx={cx} cy={96} r={13} fill={VIOLET} opacity={0.18} /><circle cx={cx} cy={96} r={7} fill={VIOLET} /></>)
                    : m.state === 'read' ? <circle cx={cx} cy={96} r={7} fill={K.bg} stroke={VIOLET} strokeWidth={1.4} />
                    : m.state === 'open' ? <circle cx={cx} cy={96} r={7} fill="none" stroke={K.inkDim} strokeDasharray="2 2.5" />
                    : <circle cx={cx} cy={96} r={3} fill={INK_SOFT} />}
                  {Array.from({ length: Math.min(m.daysWritten, 31) }, (_, k) => (
                    <rect key={k} x={cx - 9 + (k % 4) * 5} y={122 + Math.floor(k / 4) * 6} width={3} height={3} rx={0.6} fill="#7aa8d8" opacity={0.75} />
                  ))}
                </g>
              )
            })}
            {/* The sky */}
            <line x1={0} y1={SKY_TOP} x2={R} y2={SKY_TOP} stroke={K.line} />
            <text x={0} y={SKY_TOP - 6} fill={K.inkDim} fontSize={9.5} letterSpacing={1.6} fontFamily={K.fMono}>THE SKY</text>
            {retro.map(e => {
              const y = RETRO_Y + retroRows[e.id] * RETRO_ROW, x0 = x(clampStart(e.start)), w = Math.max(6, x(clampEnd(e.end)) - x0)
              return (
                <g key={e.id}>
                  <title>{`${e.title}, ${e.subtitle}`}</title>
                  <rect x={x0} y={y - 4} width={w} height={8} rx={4} fill={RETRO} opacity={0.85} />
                  {w > 44 ? <text x={x0} y={y - 8} fill={RETRO} fontSize={10.5}>{e.title.replace(' retrograde', ' ℞')}</text> : null}
                </g>
              )
            })}
            {points.map(e => {
              const cx = x(clampStart(e.start))
              return e.kind === 'eclipse' ? (
                <g key={e.id}><title>{`${e.title}, ${e.subtitle}`}</title>
                  <rect x={cx - 5} y={POINT_Y - 5} width={10} height={10} fill={K.ember} transform={`rotate(45 ${cx} ${POINT_Y})`} /></g>
              ) : (
                <g key={e.id}><title>{`${e.title}, ${e.subtitle}`}</title>
                  <line x1={cx} y1={POINT_Y - 10} x2={cx} y2={POINT_Y + 10} stroke={K.inkDim} strokeWidth={1.2} />
                  <circle cx={cx} cy={POINT_Y - 12} r={2} fill={K.inkDim} />
                  <text x={cx + 5} y={POINT_Y + 22} fill={K.inkDim} fontSize={10.5}>{e.glyph} {e.title.replace(/^(\w+) (enters|steps back into) /, '')}</text></g>
              )
            })}
            {personal.map(e => {
              const y = PERSONAL_Y + personalRows[e.id] * 32, x0 = x(clampStart(e.start)), w = Math.max(10, x(clampEnd(e.end)) - x0)
              const soft = e.glyph === '△' || e.glyph === '⚹'
              return (
                <g key={e.id}><title>{`${e.title}, ${e.subtitle}`}</title>
                  <rect x={x0} y={y - 5} width={w} height={10} rx={5} fill={soft ? '#df9b3f55' : K.brickHi} stroke={soft ? K.ember : 'none'} />
                  <text x={Math.min(x0 + 10, R - 160)} y={y - 11} fill={K.ink} fontSize={12.5}>{e.title}</text></g>
              )
            })}
            {/* Today, and the rest of the year faded */}
            {todayX !== null ? (
              <>
                <rect x={todayX} y={48} width={R - todayX} height={H - 70} fill={K.bg} opacity={0.45} pointerEvents="none" />
                <line x1={todayX} y1={44} x2={todayX} y2={H - 24} stroke={VIOLET_HI} strokeDasharray="3 3" />
                <text x={todayX} y={H - 8} fill={VIOLET_HI} fontSize={10} textAnchor="middle" letterSpacing={1.4} fontFamily={K.fMono}>TODAY</text>
              </>
            ) : null}
            {/* Unwrapped at the end of the line */}
            <UnwrappedCap timeline={timeline} cy={SKY_TOP + 14} />
            <text x={0} y={H - 8} fill="#7aa8d8" fontSize={10} letterSpacing={1.2} fontFamily={K.fMono}>▪ EACH SQUARE IS A DAY YOU WROTE</text>
          </svg>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-[1.15fr_1fr]">
        <section aria-labelledby="waiting-h" className="rounded-2xl p-5" style={{ background: K.bg2, border: `1px solid ${K.line}` }}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="waiting-h" style={{ margin: 0, fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26, fontWeight: 500 }}>Waiting for you</h2>
            <span style={mono(9.5)}>{waiting.length ? `${waiting.length} to read` : 'All read'}</span>
          </div>
          {waiting.length ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
              {waiting.map((w, i) => (
                <li key={w.key} className="flex items-center gap-3 py-3" style={{ borderTop: i ? `1px solid ${K.line}` : 'none' }}>
                  <Dot fill={VIOLET} />
                  <div className="min-w-0 flex-1">
                    <div style={{ fontSize: 16 }}>{w.title}</div>
                    <div style={{ fontSize: 13, color: K.inkDim, marginTop: 2 }}>{w.sub}</div>
                  </div>
                  {w.href
                    ? <Link href={w.href} className="text-sm underline underline-offset-4" style={{ color: VIOLET_HI }}>Read →</Link>
                    : <button type="button" onClick={w.onOpen} className="text-sm underline underline-offset-4" style={{ color: VIOLET_HI }}>Read →</button>}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: K.inkDim }}>
              {ended.length ? 'You have opened every look back that is ready. New ones arrive as each month ends.' : 'Your first look back arrives when your first month ends.'}
            </p>
          )}
        </section>

        <section aria-labelledby="sel-h" className="rounded-2xl p-5" style={{ background: `linear-gradient(160deg,#5a3eba22,transparent 55%), ${K.bg2}`, border: `1px solid ${K.line}` }}>
          <Kicker color={K.violetDim}>Selected · {monthName(sel.index)} {year}</Kicker>
          <h2 id="sel-h" style={{ margin: '8px 0 0', fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 26, fontWeight: 500, lineHeight: 1.2 }}>{sel.line}</h2>
          {selSky.length ? (
            <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.65, color: K.inkDim }}>
              In the sky: {selSky.slice(0, 4).map(e => `${e.title} (${shortDay(e.start)})`).join(', ')}.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>{sel.daysWritten} {sel.daysWritten === 1 ? 'day' : 'days'} written</Chip>
            {sel.chips.map(c => <Chip key={c}>{c}</Chip>)}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {sel.state === 'read' || sel.state === 'ready' ? (
              <button type="button" onClick={() => openMonth(sel)} className="rounded-full px-5 py-2 text-sm" style={{ background: VIOLET, color: K.bg }}>
                {sel.state === 'read' ? `Open ${monthName(sel.index)} look back →` : `Look back on ${monthName(sel.index)} →`}
              </button>
            ) : (
              <span style={{ fontSize: 14, color: K.inkDim }}>{sel.state === 'open' ? `Opens once ${monthName(sel.index)} ends.` : 'Still to come.'}</span>
            )}
          </div>
          <WeekPills weeks={weeksForMonth(weeks, sel)} label={`Week by week in ${monthName(sel.index)}`} className="mt-5" />
        </section>
      </div>
    </>
  )
}

function UnwrappedCap({ timeline, cy }: { timeline: YearTimeline; cy: number }) {
  const { year, unwrapped } = timeline
  const ux = 972
  const label = unwrapped.state === 'waiting' ? `OPENS ${shortDay(unwrapped.opensOn).toUpperCase()}` : unwrapped.state === 'ready' ? 'READY' : 'READ'
  return (
    <a href="/year/unwrapped" aria-label={`${year} Unwrapped: ${unwrapped.state === 'waiting' ? `opens ${shortDay(unwrapped.opensOn)}` : unwrapped.state === 'ready' ? 'ready' : 'read'}`}>
      <defs>
        <radialGradient id="unwrapped-glow">
          <stop offset="0%" stopColor={VIOLET_HI} stopOpacity={unwrapped.state === 'waiting' ? 0.55 : 0.9} />
          <stop offset="55%" stopColor={K.brickHi} stopOpacity={0.35} />
          <stop offset="100%" stopColor={K.brickHi} stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={`M${R} 196 C ${R + 20} 196, ${ux - 30} ${cy}, ${ux - 22} ${cy}`} stroke={VIOLET} fill="none" strokeDasharray="2 4" />
      <circle cx={ux} cy={cy} r={40} fill="url(#unwrapped-glow)" />
      <circle cx={ux} cy={cy} r={15} fill={K.bg} stroke={VIOLET_HI} strokeWidth={1.4} />
      <text x={ux} y={cy + 6} fill={VIOLET_HI} fontSize={17} textAnchor="middle" fontFamily={K.fSerif}>✦</text>
      <text x={ux} y={cy + 66} fill={K.ink} fontSize={17} textAnchor="middle" fontFamily={K.fSerif} fontStyle="italic">Unwrapped</text>
      <text x={ux} y={cy + 84} fill={K.inkDim} fontSize={9.5} textAnchor="middle" letterSpacing={1.4} fontFamily={K.fMono}>{label}</text>
    </a>
  )
}

/* ───────────────────────── List view: the almanac spine ───────────────────────── */

function ListView({ timeline, openMonth, openQuarter }: ViewProps) {
  const { year, today, months, quarters, weeks, sky, unwrapped } = timeline
  const isThisYear = today.slice(0, 4) === String(year)
  return (
    <div className="grid gap-2">
      <div className="hidden justify-between px-1 sm:flex">
        <span style={mono(10, VIOLET)}>Your reviews</span>
        <span style={mono(10)}>The sky</span>
      </div>
      {quarters.map(q => {
        const qMonths = months.slice((q.index - 1) * 3, q.index * 3)
        const clickable = q.state === 'read' || q.state === 'ready'
        return (
          <section key={q.index} aria-label={`Q${q.index} ${year}`}>
            <div className="my-4 flex items-center gap-4">
              <span aria-hidden className="h-px flex-1" style={{ background: K.line }} />
              <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 28, lineHeight: 1 }}>Q{q.index}</span>
              <button type="button" disabled={!clickable} onClick={() => openQuarter(q.index)}
                className="rounded-full px-3 py-1 disabled:cursor-default"
                style={{ ...mono(9.5, q.state === 'ready' ? K.bg : K.inkDim), background: q.state === 'ready' ? VIOLET : 'transparent', border: `1px solid ${q.state === 'ready' ? VIOLET : K.lineHi}` }}>
                {q.state === 'read' ? 'Quarter read' : q.state === 'ready' ? 'Quarter ready' : q.state === 'open' ? `Closes ${shortDay(q.end)}` : 'Not yet'}
              </button>
              <span aria-hidden className="h-px flex-1" style={{ background: K.line }} />
            </div>
            <ol className="relative grid gap-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px sm:block" style={{ background: 'linear-gradient(to bottom, #a98aef55, #a98aef22)' }} />
              {qMonths.map(m => {
                const events = skyForMonth(sky, m, m.index === 1)
                const clickableMonth = m.state === 'read' || m.state === 'ready'
                const isCurrent = isThisYear && m.state === 'open'
                return (
                  <li key={m.index} className="grid gap-2 sm:grid-cols-[1fr_56px_1fr] sm:items-center">
                    <div className="grid gap-2">
                    <button type="button" disabled={!clickableMonth} onClick={() => openMonth(m)}
                      className="flex items-center gap-4 rounded-2xl px-4 py-3 text-left disabled:cursor-default"
                      style={{
                        background: m.state === 'ready' ? `linear-gradient(to right,#a98aef1a,transparent), ${K.bg2}` : K.bg2,
                        border: `1px ${m.state === 'open' ? 'dashed' : 'solid'} ${m.state === 'ready' ? '#a98aef66' : K.line}`,
                        opacity: m.state === 'future' ? 0.5 : 1, color: K.ink,
                      }}>
                      <span style={{ fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 22, lineHeight: 1, width: 82, flex: 'none' }}>{monthName(m.index).slice(0, 3)}</span>
                      <span className="min-w-0 flex-1" style={{ fontSize: 13.5, lineHeight: 1.5, color: K.inkDim }}>{m.line}</span>
                      {m.state === 'ready' ? <span className="whitespace-nowrap text-sm" style={{ color: VIOLET_HI }}>Read →</span>
                        : m.state === 'read' ? <span style={mono(9.5)}>Read</span> : null}
                    </button>
                    <WeekPills weeks={weeksForMonth(weeks, m)} label={`Weeks in ${monthName(m.index)}`} className="px-1" />
                    </div>
                    <div aria-hidden className="relative hidden justify-center sm:flex">
                      <span style={{ position: 'relative', zIndex: 1,
                        width: m.state === 'future' ? 7 : 14, height: m.state === 'future' ? 7 : 14, borderRadius: 999,
                        background: m.state === 'ready' ? VIOLET : K.bg, boxShadow: m.state === 'ready' ? '0 0 12px #a98aef88' : 'none',
                        border: `1.5px ${m.state === 'open' ? 'dashed' : 'solid'} ${m.state === 'open' || m.state === 'future' ? INK_SOFT : VIOLET}`,
                      }} />
                    </div>
                    <SkyList events={events} first={m.index === 1} monthStart={m.start} />
                    {isCurrent ? (
                      <div className="flex items-center gap-3 sm:col-span-3">
                        <span className="h-px flex-1" style={{ background: '#c7b3f566' }} />
                        <span style={mono(10, VIOLET_HI)}>Today · {shortDay(today)}</span>
                        <span className="h-px flex-1" style={{ background: '#c7b3f566' }} />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
      <section aria-label={`${year} Unwrapped`} className="mt-6 grid gap-6 rounded-3xl p-6 sm:grid-cols-[1.2fr_1fr] sm:items-end sm:p-10"
        style={{ background: `radial-gradient(120% 140% at 85% 0%, #5a3eba55, transparent 60%), ${K.bg2}`, border: `1px solid ${K.line}` }}>
        <div>
          <Kicker color={K.ink}>The end of the line · {shortDay(unwrapped.opensOn)}, {year + 1}</Kicker>
          <h2 style={{ margin: '10px 0 0', fontFamily: K.fSerif, fontStyle: 'italic', fontSize: 40, fontWeight: 500, lineHeight: 1.05 }}>your {year}, unwrapped.</h2>
          <p style={{ margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.6, color: K.inkDim }}>
            {unwrapped.state === 'waiting' ? 'The story of your year, from the days you wrote and the sky you moved through. It opens when the year ends.'
              : unwrapped.state === 'ready' ? 'Your year has ended. Its story is ready to prepare.' : 'Your year’s story is waiting to be read again.'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {unwrapped.state === 'waiting' ? (
            <><span style={{ fontFamily: K.fSerif, fontSize: 56, lineHeight: 1 }}>{unwrapped.daysToGo}</span><span style={mono(10, K.ink)}>{unwrapped.daysToGo === 1 ? 'day' : 'days'} to go</span></>
          ) : null}
          {unwrapped.state !== 'waiting' ? (
            <Link href="/year/unwrapped" className="rounded-full px-5 py-2 text-sm" style={{ border: `1px solid ${K.lineHi}`, color: K.ink }}>Open Unwrapped →</Link>
          ) : null}
        </div>
      </section>
    </div>
  )
}

/** The weeks under a month: each opens that week's reflection once the week has ended. */
function WeekPills({ weeks, label, className }: { weeks: TimelineWeek[]; label: string; className?: string }) {
  const shown = weeks.filter(w => w.state !== 'future')
  if (!shown.length) return null
  const pill: CSSProperties = { fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.06em', padding: '5px 10px', borderRadius: 999, whiteSpace: 'nowrap' }
  return (
    <div className={className}>
      <div style={mono(9.5)}>{label}</div>
      <ul className="mt-2 flex flex-wrap gap-2" style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
        {shown.map(w => (
          <li key={w.start}>
            {w.state === 'open' ? (
              <span title="This week is still unfolding" style={{ ...pill, border: `1px dashed ${K.lineHi}`, color: INK_SOFT }}>{weekRangeLabel(w)}</span>
            ) : (
              <Link href={weekReflectionHref(w)} title={w.line ?? (w.state === 'ready' ? 'Ready to prepare' : undefined)}
                aria-label={`Week of ${weekRangeLabel(w)}: ${w.state === 'read' ? 'ready to read' : 'ready to prepare'}`}
                style={{ ...pill, display: 'inline-block', border: `1px solid ${w.state === 'ready' ? '#a98aef88' : K.lineHi}`, background: w.state === 'ready' ? '#a98aef22' : 'transparent', color: w.state === 'ready' ? VIOLET_HI : K.ink }}>
                {weekRangeLabel(w)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SkyList({ events, first, monthStart }: { events: TimelineSkyEvent[]; first: boolean; monthStart: string }) {
  if (!events.length) return <div className="pl-4 sm:pl-1" style={{ fontSize: 13.5, color: K.inkDim, fontStyle: 'italic' }}>A quiet sky</div>
  return (
    <ul className="grid gap-1.5 pl-4 sm:pl-1" style={{ listStyle: 'none', margin: 0 }}>
      {events.slice(0, 4).map(e => {
        const underway = first && e.start < monthStart
        const tone = e.kind === 'eclipse' ? K.ember : e.kind === 'retrograde' ? RETRO : e.personal ? (e.glyph === '△' ? K.ember : '#8466e6') : K.inkDim
        return (
          <li key={e.id} className="flex items-center gap-2.5" style={{ fontSize: 13.5 }} title={e.subtitle}>
            <span aria-hidden style={{ fontFamily: K.fSerif, fontSize: 16, width: 20, textAlign: 'center', color: tone, flex: 'none' }}>{e.glyph}</span>
            <span className="min-w-0 flex-1">{e.title}{e.personal ? <span style={{ color: K.inkDim, fontSize: 12 }}> · your chart</span> : null}</span>
            <span style={mono(9.5)}>{underway ? 'under way' : shortDay(e.start)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Dot({ fill, ring }: { fill?: string; ring?: string }) {
  return <span aria-hidden style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 999, background: fill ?? 'transparent', border: ring ? `1px solid ${ring}` : 'none', marginRight: 6, flex: 'none' }} />
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: K.fMono, fontSize: 10.5, letterSpacing: '0.08em', padding: '5px 10px', borderRadius: 4, background: K.bg3, border: `1px solid ${K.line}`, color: K.inkDim }}>{children}</span>
}
