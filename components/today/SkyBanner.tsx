'use client'

import { ChevronDown } from 'lucide-react'
import { MoonGlyph, StarField, K } from '@/components/almanac'
import { AskOracleButton } from '@/components/oracle/AskOracleButton'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import { buildTransitPlacementExplanation } from '@/lib/human-design'
import type { HumanDesignTransitWeather } from '@/lib/human-design-transit-model'
import { buildHumanDesignWeatherPrompt, buildPlacementPrompt } from '@/lib/oracle/preseed'
import type { TodayContext } from '@/lib/today/get-today-context'
import type { Planet, ZodiacSign } from '@/types/blueprint'

interface Props {
  context: TodayContext
  weekTheme?: string | null
  humanDesignWeather?: HumanDesignTransitWeather | null
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
export function SkyBanner({ context, weekTheme, humanDesignWeather }: Props) {
  const { today, sabian, meta } = context
  const { hasOracleAccess } = useStelloquy()
  const moonPos = `${Math.round(today.moon.degreeInSign)}° ${signGlyph(today.moon.sign)}`
  const sunPos = `${Math.round(today.sun.degreeInSign)}° ${signGlyph(today.sun.sign)}`
  const illumPct = Math.round(today.moonIllumination * 100)
  const sunPrompt = placementPromptFor('Sun' as Planet, today.sun.sign as ZodiacSign, today.sun.degreeInSign)
  const moonPrompt = placementPromptFor('Moon' as Planet, today.moon.sign as ZodiacSign, today.moon.degreeInSign)
  const humanDesignPrompt = humanDesignWeather
    ? buildHumanDesignWeatherPrompt(humanDesignWeather, 'today')
    : null
  const holdingPrompt =
    humanDesignWeather?.holding ? buildHumanDesignWeatherPrompt(humanDesignWeather, 'holding') : null

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
        className="flex flex-col items-start gap-5 sm:flex-row sm:justify-between"
        style={{
          position: 'relative',
          alignItems: 'flex-start',
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
            {weekTheme ?? 'the sky is editing. Trust the small revision.'}
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
          className="items-start sm:items-end"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
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

      {humanDesignWeather && humanDesignPrompt ? (
        <details className="group" style={{ position: 'relative', marginTop: 20, maxWidth: 860 }}>
          <summary
            className="flex flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden [&::marker]:hidden"
            style={{
              cursor: 'pointer',
              fontFamily: K.fMono,
              fontSize: 13,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: K.kairosHi,
              lineHeight: 1.5,
              borderRadius: 10,
              border: `1px solid ${K.kairosHi}40`,
              background: `${K.midnight}b3`,
              padding: '10px 14px',
            }}
          >
            <span>Live Human Design</span>
            <span style={{ color: K.inkDim, letterSpacing: '0.08em' }}>
              {humanDesignWeather.body ? `${humanDesignWeather.body.type} design` : 'Shared weather'}
            </span>
            <span
              className="truncate"
              style={{
                marginLeft: 'auto',
                minWidth: 0,
                maxWidth: 280,
                color: K.inkSoft,
                fontSize: 11.5,
                letterSpacing: '0.04em',
                textTransform: 'none',
              }}
            >
              {humanDesignWeather.today.headline}
            </span>
            <ChevronDown
              size={15}
              className="shrink-0 transition-transform duration-200 group-open:rotate-180"
              style={{ color: K.kairosHi }}
            />
          </summary>

          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
            style={{ marginTop: 10 }}
          >
            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  fontFamily: K.fMono,
                  fontSize: 11.5,
                  letterSpacing: '0.06em',
                  color: K.inkSoft,
                }}
              >
                What is this?
              </summary>
              <p
                style={{
                  marginTop: 6,
                  maxWidth: 480,
                  fontFamily: K.fBody,
                  fontSize: 13.5,
                  color: K.inkDim,
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: K.ink, fontWeight: 600 }}>Today</strong> is what the sky is
                activating right now. <strong style={{ color: K.ink, fontWeight: 600 }}>Holding</strong>{' '}
                is a slower transit that's been building for weeks, checked against the pattern in
                your natal Human Design chart.
              </p>
            </details>
          </div>

          {/* AskOracleButton wraps its children in a real <button>, so the
              collapsible technical-details block below lives outside it —
              nesting <details> inside a <button> is invalid HTML and would
              make expanding it also fire the Oracle overlay. */}
          <div
            className="group mt-3 rounded-xl p-5 text-left sm:p-6"
            style={{
              border: `1px solid ${K.kairosHi}55`,
              background: `linear-gradient(110deg, ${K.midnight}e8, ${K.kairos}2e)`,
              boxShadow: `inset 0 1px 0 ${K.starlight}12`,
            }}
          >
            <AskOracleButton
              prompt={humanDesignPrompt}
              hasOracleAccess={hasOracleAccess}
              label="today's Human Design weather"
              triggerClassName="block w-full text-left"
            >
              <div className="min-w-0">
                <h3
                  style={{
                    fontFamily: K.fSerif,
                    fontSize: 'clamp(23px, 3.2vw, 28px)',
                    color: K.ink,
                    lineHeight: 1.25,
                    textWrap: 'balance',
                  }}
                >
                  {humanDesignWeather.today.headline}
                </h3>
                <p
                  style={{
                    marginTop: 8,
                    maxWidth: 760,
                    fontFamily: K.fBody,
                    fontSize: 16.5,
                    color: K.starlight,
                    lineHeight: 1.65,
                  }}
                >
                  {humanDesignWeather.today.detail}
                </p>
                <p
                  style={{
                    marginTop: 10,
                    maxWidth: 720,
                    fontFamily: K.fBody,
                    fontStyle: 'italic',
                    fontSize: 14.5,
                    color: K.inkDim,
                    lineHeight: 1.5,
                  }}
                >
                  {humanDesignWeather.guidance}
                </p>

                <div className="mt-3 flex justify-end">
                  <span
                    className="whitespace-nowrap transition-colors group-hover:text-white"
                    style={{
                      fontFamily: K.fMono,
                      fontSize: 13,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: K.kairosHi,
                    }}
                  >
                    Unpack this with Stelloquy →
                  </span>
                </div>
              </div>
            </AskOracleButton>

            <details className="mt-4 border-t pt-3" style={{ borderColor: K.lineHi }}>
              <summary
                style={{
                  cursor: 'pointer',
                  fontFamily: K.fMono,
                  fontSize: 12.5,
                  letterSpacing: '0.11em',
                  textTransform: 'uppercase',
                  color: K.inkDim,
                }}
              >
                Technical details
              </summary>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: K.fBody,
                  fontSize: 14.5,
                  color: K.inkDim,
                  lineHeight: 1.55,
                  overflowWrap: 'anywhere',
                }}
              >
                {humanDesignWeather.today.technicalDetail}
                {humanDesignWeather.today.boundaryNote
                  ? ` ${humanDesignWeather.today.boundaryNote}`
                  : ''}
              </div>
            </details>
          </div>

          {humanDesignWeather.holding && holdingPrompt ? (
            <div
              className="group mt-3 rounded-lg p-4 text-left"
              style={{
                border: `1px solid ${K.lineHi}`,
                background: `${K.midnight}b0`,
              }}
            >
              <AskOracleButton
                prompt={holdingPrompt}
                hasOracleAccess={hasOracleAccess}
                label="the slower Human Design pattern holding right now"
                triggerClassName="block w-full text-left"
              >
                <div
                  style={{
                    fontFamily: K.fMono,
                    fontSize: 11.5,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: K.inkSoft,
                  }}
                >
                  Holding
                </div>
                <h4
                  style={{
                    marginTop: 6,
                    fontFamily: K.fSerif,
                    fontSize: 18,
                    color: K.ink,
                    lineHeight: 1.3,
                    textWrap: 'balance',
                  }}
                >
                  {humanDesignWeather.holding.headline}
                </h4>
                <p
                  style={{
                    marginTop: 6,
                    maxWidth: 720,
                    fontFamily: K.fBody,
                    fontSize: 14.5,
                    color: K.inkDim,
                    lineHeight: 1.6,
                  }}
                >
                  {humanDesignWeather.holding.detail}
                </p>
              </AskOracleButton>

              <details className="mt-3">
                <summary
                  style={{
                    cursor: 'pointer',
                    fontFamily: K.fMono,
                    fontSize: 11.5,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: K.inkSoft,
                  }}
                >
                  Technical details
                </summary>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: K.fBody,
                    fontSize: 13.5,
                    color: K.inkDim,
                    lineHeight: 1.5,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {humanDesignWeather.holding.technicalDetail}
                  {humanDesignWeather.holding.boundaryNote
                    ? ` ${humanDesignWeather.holding.boundaryNote}`
                    : ''}
                </div>
              </details>
            </div>
          ) : null}
        </details>
      ) : null}
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
