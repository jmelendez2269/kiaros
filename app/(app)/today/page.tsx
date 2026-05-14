import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { Frame, Kicker, MoonGlyph, StarField, K, GLYPH } from '@/components/almanac'
import { getSabianForDegree } from '@/lib/ephemeris/sabian'

const APP_TIME_ZONE = 'America/New_York'

function todayISO(timeZone = APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().slice(0, 10)
}

function prettyDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: APP_TIME_ZONE,
  })
}

function getISOWeek(iso: string): number {
  const date = new Date(`${iso}T12:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getFullYear(), 0, 1))
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.ceil(((current - yearStart.getTime()) / 86400000 + 1) / 7)
}

function dayOfYear(iso: string): number {
  const date = new Date(`${iso}T12:00:00`)
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

export default async function TodayPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const today = todayISO()
  const week = getISOWeek(today)
  const day = dayOfYear(today)

  // Pull today's ephemeris row from Supabase if the user's blueprint has been
  // generated for this year. If it hasn't (new user, mid-year signup), the
  // banner falls back to display-only static content.
  const supabase = await createServerSupabase()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, first_name')
    .maybeSingle()

  // Best-effort sun position lookup for the Sabian symbol. The full data
  // pipeline lives in lib/ephemeris/transit-calculator; here we just need
  // one number, so we approximate from the day-of-year (Sun moves ~1°/day,
  // crossing 0° Aries ~Mar 20 ≈ day 80).
  const approxSunDegree = ((day - 80) % 360 + 360) % 360 || 360
  const sabian = getSabianForDegree(approxSunDegree)

  // Approximate moon phase from day of year for the v1 visual. Replace
  // with lib/ephemeris readings in Phase 1.B once the data integration
  // mirrors the dashboard query.
  const approxLunation = ((day % 29.5) / 29.5)

  return (
    <div
      style={{
        fontFamily: K.fBody,
        color: K.ink,
        background: K.bg,
        backgroundImage: `radial-gradient(ellipse at top, ${K.brick}26 0%, transparent 40%), radial-gradient(ellipse at bottom right, ${K.kairos}14 0%, transparent 50%)`,
        minHeight: '100%',
        padding: 28,
        display: 'grid',
        gap: 18,
      }}
    >
      {/* Sky banner */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 14,
          padding: 28,
          minHeight: 220,
          border: `1px solid ${K.copper}44`,
          background: `linear-gradient(180deg, #1a2240 0%, #3a2d4a 35%, #6b3d4a 65%, ${K.copper} 90%, ${K.copperHi} 100%)`,
        }}
      >
        <StarField count={28} seed={3} opacity={0.55} />
        <svg
          viewBox="0 0 100 12"
          preserveAspectRatio="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 40, opacity: 0.6 }}
        >
          <path
            d="M 0 10 L 8 8 L 14 9 L 22 6 L 30 8 L 38 5 L 46 7 L 54 4 L 62 6 L 70 5 L 78 8 L 86 6 L 94 9 L 100 8 L 100 12 L 0 12 Z"
            fill="#1a0e08"
          />
        </svg>
        <div style={{ position: 'absolute', right: '8%', bottom: '22%', width: 56, height: 56, borderRadius: '50%', background: `radial-gradient(circle, ${K.copperHi}, ${K.ember}88 60%, transparent)`, boxShadow: `0 0 60px ${K.copperHi}` }} />
        <div style={{ position: 'absolute', top: 30, left: '32%' }}>
          <MoonGlyph phase={approxLunation} size={28} color="#e8dcc4" />
        </div>

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ maxWidth: 580 }}>
            <div
              style={{
                fontFamily: K.fMono,
                fontSize: 10,
                color: '#e8dcc4',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                opacity: 0.92,
              }}
            >
              {prettyDate(today)}
            </div>
            <div
              style={{
                fontFamily: K.fSerif,
                fontStyle: 'italic',
                fontSize: 38,
                color: '#fff5e0',
                lineHeight: 1.08,
                marginTop: 8,
                textWrap: 'balance',
              }}
            >
              {profile?.first_name ? `${profile.first_name}, ` : ''}the sky is editing. Trust the small revision.
            </div>
            <div
              style={{
                fontFamily: K.fBody,
                fontSize: 13.5,
                color: '#f0e0c8',
                marginTop: 12,
                lineHeight: 1.55,
              }}
            >
              <span style={{ fontStyle: 'italic' }}>Sabian for the Sun — {sabian.position}:</span>{' '}
              {sabian.symbol}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              alignItems: 'flex-end',
              fontFamily: K.fMono,
              fontSize: 10,
              color: '#f0e0c8',
              letterSpacing: '0.16em',
              flexShrink: 0,
            }}
          >
            <div>WEEK {String(week).padStart(2, '0')} · DAY {String(day).padStart(3, '0')}</div>
            <div style={{ color: '#fff5e0', marginTop: 6 }}>
              ☉ {sabian.position}
            </div>
          </div>
        </div>
      </div>

      {/* Holding panel for the rest of the Today layout — wired up in Phase 1.B */}
      <Frame tone="umber" padding={28}>
        <Kicker>The shape of today</Kicker>
        <div
          style={{
            fontFamily: K.fSerif,
            fontStyle: 'italic',
            fontSize: 22,
            color: K.ink,
            marginTop: 8,
            lineHeight: 1.2,
            maxWidth: 620,
          }}
        >
          The new Today screen is alive. The data layer wires in next —
          shape-of-today cards, active transits, the week ribbon, and the
          line-for-today composer.
        </div>
        <div style={{ marginTop: 14, fontFamily: K.fBody, fontSize: 13, color: K.inkDim, lineHeight: 1.6 }}>
          The sidebar, palette, fonts, and Stelloquy orb are the new design.
          The Today layout itself wires up next — shape-of-today, active
          transits, week ribbon, and a quick-line composer.
        </div>
        <div style={{ marginTop: 16, fontFamily: K.fMono, fontSize: 10, color: K.inkSoft, letterSpacing: '0.18em' }}>
          {GLYPH.sun} · phase 1.a · warm almanac · {today}
        </div>
      </Frame>
    </div>
  )
}
