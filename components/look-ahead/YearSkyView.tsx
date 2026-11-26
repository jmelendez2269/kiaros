import { K, Kicker, StarField } from '@/components/almanac'
import type { SkyTone, YearSky } from '@/lib/look-ahead/sky'

const TONE: Record<SkyTone, { color: string; label: string }> = {
  plum: { color: K.plum, label: K.plum },
  ember: { color: K.ember, label: K.ember },
  starlight: { color: K.starlight, label: K.starlight },
  sage: { color: K.sage, label: K.stelloBlueSoft },
  violet: { color: K.copper, label: K.copperHi },
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const mono = { fontFamily: K.fMono, letterSpacing: '0.14em', textTransform: 'uppercase' } as const
const serif = { fontFamily: K.fSerif, fontStyle: 'italic', fontWeight: 500 } as const

/** The sky of a planner year over the member's chart. Every date comes from the ephemeris tables. */
export function YearSkyView({ sky }: { sky: YearSky }) {
  return (
    <div className="grid gap-[18px]" style={{ color: K.ink }}>
      <section
        aria-label={String(sky.year)}
        className="relative flex min-h-[220px] flex-col justify-between gap-5 overflow-hidden rounded-[14px] p-6 sm:p-7"
        style={{ background: `radial-gradient(ellipse at top right, ${K.brick}55, transparent 60%), linear-gradient(160deg, ${K.bg3}, ${K.midnight})` }}
      >
        <StarField count={28} seed={9} opacity={0.55} />
        <div className="relative flex flex-wrap justify-between gap-3" style={{ ...mono, fontSize: 10.5, letterSpacing: '0.18em', color: K.starlight }}>
          <span>Looking ahead</span>
          <span>Open since Nov 1</span>
        </div>
        <div className="relative grid max-w-[680px] gap-2.5">
          <span style={{ ...serif, fontSize: 64, lineHeight: 1, color: '#ffffff', textShadow: `0 1px 18px ${K.midnight}` }}>{sky.year}</span>
          <span style={{ ...serif, fontWeight: 400, fontSize: 26, lineHeight: 1.2, color: '#ffffff', textShadow: `0 1px 14px ${K.midnight}` }}>
            the sky of next year, already over your chart.
          </span>
          <span className="self-start rounded-full px-3 py-1.5" style={{ ...mono, fontSize: 10.5, background: `${K.midnight}b3`, color: K.ink }}>
            Where the planets will be · nothing here is due yet
          </span>
        </div>
      </section>

      <section aria-label={`${sky.year} at a glance`} className="grid gap-3.5 rounded-2xl p-5 sm:p-6" style={{ border: `1px solid ${K.line}`, background: K.bg2 }}>
        <Kicker color={K.plum}>The year at a glance</Kicker>
        <div style={{ overflowX: 'auto' }}>
          <div className="flex flex-col" style={{ minWidth: 640 }}>
            <div className="grid gap-4 pb-1.5" style={{ gridTemplateColumns: '210px minmax(0, 1fr)', ...mono, fontSize: 10, letterSpacing: '0.12em', color: K.inkDim }}>
              <span />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
                {MONTHS.map((m) => <span key={m}>{m}</span>)}
              </div>
            </div>
            {sky.rows.map((row) => {
              const tone = TONE[row.tone]
              return (
                <div key={row.key} className="grid items-center gap-4 py-3" style={{ gridTemplateColumns: '210px minmax(0, 1fr)', borderTop: `1px solid ${K.line}` }}>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden style={{ flex: 'none', width: 26, textAlign: 'center', fontFamily: K.fSerif, fontSize: 17, color: tone.color }}>{row.glyph}</span>
                    <div className="flex min-w-0 flex-col">
                      <span style={{ fontSize: 14.5 }}>{row.title}</span>
                      <span style={{ fontSize: 12, color: K.inkDim }}>{row.note}</span>
                    </div>
                  </div>
                  <div aria-hidden className="relative" style={{ height: 22 }}>
                    <div className="absolute inset-x-0" style={{ top: 10, height: 2, background: K.line }} />
                    {row.bands.map((b, i) => (
                      <div key={i} className="absolute" style={{ top: 5, height: 12, borderRadius: 2, opacity: 0.45, left: `${b.left}%`, width: `${b.width}%`, background: tone.color }} />
                    ))}
                    {row.marks.map((m, i) => (
                      <div key={i} className="absolute" style={{ top: 3, width: 16, height: 16, marginLeft: -8, borderRadius: 999, border: `2px solid ${tone.color}`, background: K.bg2, left: `${m}%` }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {sky.slowRetrogrades ? <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: K.inkDim }}>{sky.slowRetrogrades}</p> : null}
      </section>

      {sky.meetings.length ? (
        <section aria-label={`Where ${sky.year} meets your chart`} className="grid gap-3.5">
          <Kicker color={K.violetDim}>Where {sky.year} meets your chart</Kicker>
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {sky.meetings.map((m) => {
              const tone = TONE[m.tone]
              return (
                <div key={m.id} className="flex flex-col gap-2 rounded-[10px] p-[18px]" style={{ background: K.bg3, border: `1px solid ${tone.color}44` }}>
                  <span style={{ ...mono, fontSize: 10, color: tone.label }}>{m.kicker}</span>
                  <span style={{ ...serif, fontSize: 22, lineHeight: 1.25 }}>{m.title}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.6, color: K.inkDim }}>{m.body}</span>
                </div>
              )
            })}
          </div>
          {!sky.housesKnown ? (
            <p style={{ margin: 0, fontSize: 13, color: K.inkDim }}>Without a birth time, houses are left out. Signs and dates still hold.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
