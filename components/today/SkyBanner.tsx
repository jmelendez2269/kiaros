import { MoonGlyph, StarField, K } from '@/components/almanac'
import type { TodayContext } from '@/lib/today/get-today-context'

interface Props {
  context: TodayContext
  firstName?: string | null
}

// The editorial moment of the page. Uses a sunset gradient by default;
// later we can vary by time of day or season via window.__kairosTweaks.
export function SkyBanner({ context, firstName }: Props) {
  const { today, sabian, meta } = context
  const moonPos = `${Math.round(today.moon.degreeInSign)}° ${signGlyph(today.moon.sign)}`
  const sunPos = `${Math.round(today.sun.degreeInSign)}° ${signGlyph(today.sun.sign)}`
  const illumPct = Math.round(today.moonIllumination * 100)

  return (
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
      <div
        style={{
          position: 'absolute',
          right: '8%',
          bottom: '22%',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${K.copperHi}, ${K.ember}88 60%, transparent)`,
          boxShadow: `0 0 60px ${K.copperHi}`,
        }}
      />
      <div style={{ position: 'absolute', top: 30, left: '32%' }}>
        <MoonGlyph phase={today.moonIllumination} size={28} color="#e8dcc4" />
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
        }}
      >
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
            {meta.longLabel}
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
            {firstName ? `${firstName}, ` : ''}the sky is editing. Trust the small revision.
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
          <div>
            WEEK {String(meta.isoWeek).padStart(2, '0')} · DAY {String(meta.dayOfYear).padStart(3, '0')}
          </div>
          <div style={{ color: '#fff5e0', marginTop: 6 }}>☉ {sunPos}</div>
          <div style={{ color: '#fff5e0' }}>
            ☽ {moonPos} · {illumPct}%
          </div>
        </div>
      </div>
    </div>
  )
}

function signGlyph(sign: string): string {
  const map: Record<string, string> = {
    Aries: '♈',
    Taurus: '♉',
    Gemini: '♊',
    Cancer: '♋',
    Leo: '♌',
    Virgo: '♍',
    Libra: '♎',
    Scorpio: '♏',
    Sagittarius: '♐',
    Capricorn: '♑',
    Aquarius: '♒',
    Pisces: '♓',
  }
  return map[sign] ?? '·'
}
