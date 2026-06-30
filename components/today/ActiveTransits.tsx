'use client'

import { useState } from 'react'
import { Frame, K, Kicker, GLYPH } from '@/components/almanac'
import { AskOracleButton } from '@/components/oracle/AskOracleButton'
import { useStelloquy } from '@/components/oracle/StelloquyProvider'
import { buildActiveTransitPrompt } from '@/lib/oracle/preseed'
import type { ActiveTransitsResult, ActiveTransitRow } from '@/lib/today/get-active-transits'
import type { AspectKind } from '@/components/almanac/tokens'
import type { Planet } from '@/types/blueprint'

interface Props {
  data: ActiveTransitsResult
}

const PLANET_GLYPH: Record<Planet, string> = {
  Sun: GLYPH.sun,
  Moon: GLYPH.moon,
  Mercury: GLYPH.mercury,
  Venus: GLYPH.venus,
  Mars: GLYPH.mars,
  Jupiter: GLYPH.jupiter,
  Saturn: GLYPH.saturn,
  Uranus: GLYPH.uranus,
  Neptune: GLYPH.neptune,
  Pluto: GLYPH.pluto,
}

const ASPECT_GLYPH: Record<AspectKind, string> = {
  conjunction: GLYPH.conjunction,
  opposition: GLYPH.opposition,
  square: GLYPH.square,
  trine: GLYPH.trine,
  sextile: GLYPH.sextile,
}

const ASPECT_TONE: Record<AspectKind, string> = {
  conjunction: K.copper,
  opposition: K.brickHi,
  square: K.brick,
  trine: K.sage,
  sextile: K.copperHi,
}

const RARITY_TONE: Record<string, string> = {
  common: K.inkSoft,
  frequent: K.inkSoft,
  uncommon: K.plum,
  rare: K.copperHi,
  'once-in-lifetime': K.ember,
}

export function ActiveTransits({ data }: Props) {
  const { hasOracleAccess } = useStelloquy()
  const [lifetimeOpen, setLifetimeOpen] = useState(false)

  if (data.status === 'no-chart') {
    return (
      <Frame tone="umber" padding={22}>
        <Kicker color={K.copper}>Active transits</Kicker>
        <p
          style={{
            marginTop: 10,
            fontFamily: K.fSerif,
            fontStyle: 'italic',
            fontSize: 16.5,
            color: K.inkDim,
            lineHeight: 1.5,
          }}
        >
          Complete your birth chart on the Self screen to see today's personal
          transits.
        </p>
      </Frame>
    )
  }

  const { current, lifetime } = data
  const hasAny = current.length > 0 || lifetime.length > 0

  if (!hasAny) {
    return (
      <Frame tone="umber" padding={22}>
        <Kicker color={K.copper}>Active transits</Kicker>
        <p
          style={{
            marginTop: 10,
            fontFamily: K.fSerif,
            fontStyle: 'italic',
            fontSize: 16.5,
            color: K.inkDim,
            lineHeight: 1.5,
          }}
        >
          No personal transits inside a tight orb today. The moon is doing more
          of the carrying.
        </p>
      </Frame>
    )
  }

  return (
    <Frame tone="umber" padding={22}>
      <Kicker color={K.copper}>Active transits</Kicker>

      {/* Current / short-wave transits */}
      {current.length > 0 ? (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' }}>
          {current.map((row, i) => (
            <AskOracleButton
              key={`${row.planet}-${row.aspect}-${row.natalPlanet}`}
              prompt={buildActiveTransitPrompt(row)}
              hasOracleAccess={hasOracleAccess}
              label={`this ${row.technical}`}
              triggerClassName="block w-full text-left rounded-sm transition-colors hover:bg-[rgba(255,245,224,0.04)]"
            >
              <TransitRow row={row} first={i === 0} />
            </AskOracleButton>
          ))}
        </div>
      ) : (
        <p
          style={{
            marginTop: 10,
            fontFamily: K.fSerif,
            fontStyle: 'italic',
            fontSize: 15,
            color: K.inkDim,
            lineHeight: 1.5,
          }}
        >
          No fast-moving transits today — the slower planets are holding the field.
        </p>
      )}

      {/* Lifetime / outer-planet transits — collapsible */}
      {lifetime.length > 0 && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${K.line}`, paddingTop: 12 }}>
          <button
            type="button"
            onClick={() => setLifetimeOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: K.ember,
              fontFamily: K.fMono,
              fontSize: 10.5,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transition: 'transform 180ms',
                transform: lifetimeOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                fontSize: 10,
              }}
            >
              ▶
            </span>
            Lifetime currents ({lifetime.length})
          </button>

          {lifetimeOpen && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' }}>
              <p
                style={{
                  fontFamily: K.fSerif,
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: K.inkSoft,
                  lineHeight: 1.5,
                  marginBottom: 8,
                }}
              >
                Slow outer-planet transits that define a years-long season of your life.
              </p>
              {lifetime.map((row, i) => (
                <AskOracleButton
                  key={`${row.planet}-${row.aspect}-${row.natalPlanet}`}
                  prompt={buildActiveTransitPrompt(row)}
                  hasOracleAccess={hasOracleAccess}
                  label={`this ${row.technical}`}
                  triggerClassName="block w-full text-left rounded-sm transition-colors hover:bg-[rgba(255,245,224,0.04)]"
                >
                  <TransitRow row={row} first={i === 0} />
                </AskOracleButton>
              ))}
            </div>
          )}
        </div>
      )}
    </Frame>
  )
}

function TransitRow({ row, first }: { row: ActiveTransitRow; first: boolean }) {
  const aspectKey = row.aspect as AspectKind
  const tone = ASPECT_TONE[aspectKey] ?? K.copper
  const rarityColor = RARITY_TONE[row.rarity] ?? K.inkSoft

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '92px minmax(0, 1fr) auto auto',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        borderTop: first ? 'none' : `1px solid ${K.line}`,
      }}
    >
      <div
        style={{
          fontFamily: K.fSerif,
          fontSize: 24,
          color: tone,
          letterSpacing: '0.12em',
          whiteSpace: 'nowrap',
        }}
        aria-label={row.technical}
      >
        {PLANET_GLYPH[row.planet]} {ASPECT_GLYPH[aspectKey]} {PLANET_GLYPH[row.natalPlanet]}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: K.fBody,
            fontSize: 14.5,
            color: K.ink,
            lineHeight: 1.35,
          }}
        >
          {row.technical}
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: K.fMono,
            fontSize: 10.5,
            color: rarityColor,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {row.rarityLabel}
        </div>
      </div>
      <div
        style={{
          fontFamily: K.fMono,
          fontSize: 12,
          color: K.inkDim,
          whiteSpace: 'nowrap',
        }}
      >
        {row.orb.toFixed(1)}°
      </div>
      <div
        style={{
          fontFamily: K.fMono,
          fontSize: 10,
          color: K.inkSoft,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {row.applying ? 'applying' : 'separating'}
      </div>
    </div>
  )
}
