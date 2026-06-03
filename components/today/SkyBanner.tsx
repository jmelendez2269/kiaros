'use client'

import { MoonGlyph, StarField, K } from '@/components/almanac'
import { AskOracleButton } from '@/components/oracle/AskOracleButton'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import { buildTransitPlacementExplanation } from '@/lib/human-design'
import { buildPlacementPrompt } from '@/lib/oracle/preseed'
import type { TodayContext } from '@/lib/today/get-today-context'
import type { Planet, ZodiacSign } from '@/types/blueprint'

interface Props {
  context: TodayContext
  firstName?: string | null
  weekTheme?: string | null
}

function placementPromptFor(planet: Planet, sign: ZodiacSign, degreeInSign: number): string {
  // No-aspects prompt for now — the SkyBanner doesn't carry today's per-day
  // aspect set yet. When we wire that in, swap aspects: [] for the real list.
  const explanation = buildTransitPlacementExplanation({
    planet,
    sign,
    degreeInSign,
    aspects: [],
  })
  return buildPlacementPrompt(explanation)
}

// The editorial moment of the page. Uses a sunset gradient by default;
// later we can vary by time of day or season via window.__kairosTweaks.
export function SkyBanner({ context, firstName, weekTheme }: Props) {
  const { today, sabian, meta } = context
  const { hasOracleAccess } = useStelloquy()
  const moonPos = `${Math.round(today.moon.degreeInSign)}° ${signGlyph(today.moon.sign)}`
  const sunPos = `${Math.round(today.sun.degreeInSign)}° ${signGlyph(today.sun.sign)}`
  const illumPct = Math.round(today.moonIllumination * 100)
  const sunPrompt = placementPromptFor('Sun' as Planet, today.sun.sign as ZodiacSign, today.sun.degreeInSign)
  const moonPrompt = placementPromptFor('Moon' as Planet, today.moon.sign as ZodiacSign, today.moon.degreeInSign)

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
        padding: 28,
        minHeight: 220,
        border: `1px solid ${K.copper}44`,
        background: `linear-gradient(180deg, ${K.midnight} 0%, ${K.bg4} 35%, ${K.brick} 65%, ${K.copper} 90%, ${K.copperHi} 100%)`,
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
          fill={K.midnight}
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
        <MoonGlyph phase={today.moonIllumination} size={28} color={K.ink} />
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
              fontSize: 11.5,
              color: K.ink,
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
              fontSize: 42,
              color: K.ink,
              lineHeight: 1.08,
              marginTop: 8,
              textWrap: 'balance',
            }}
          >
            {firstName ? `${firstName} — ` : ''}{weekTheme ?? 'the sky is editing. Trust the small revision.'}
          </div>
          <div
            style={{
              fontFamily: K.fBody,
              fontSize: 15,
              color: K.inkDim,
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
            fontSize: 11.5,
            color: K.inkDim,
            letterSpacing: '0.16em',
            flexShrink: 0,
          }}
        >
          <div>
            WEEK {String(meta.isoWeek).padStart(2, '0')} · DAY {String(meta.dayOfYear).padStart(3, '0')}
          </div>
          <AskOracleButton
            prompt={sunPrompt}
            hasOracleAccess={hasOracleAccess}
            label={`the Sun at ${sunPos}`}
          >
            <span style={placementChipStyle}>☉ {sunPos}</span>
          </AskOracleButton>
          <AskOracleButton
            prompt={moonPrompt}
            hasOracleAccess={hasOracleAccess}
            label={`the Moon at ${moonPos}`}
          >
            <span style={placementChipStyle}>☽ {moonPos} · {illumPct}%</span>
          </AskOracleButton>
        </div>
      </div>
    </div>
  )
}

const placementChipStyle: React.CSSProperties = {
  display: 'inline-block',
  color: K.ink,
  marginTop: 6,
  padding: '2px 6px',
  borderRadius: 4,
  transition: 'background 0.15s, border-color 0.15s',
  border: `1px solid ${K.lineHi}`,
  background: 'rgba(227, 226, 237, 0.04)',
  cursor: 'pointer',
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
