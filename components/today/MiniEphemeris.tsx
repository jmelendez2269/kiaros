import { Kicker, EphemerisWheel, K, type PlanetMap } from '@/components/almanac'
import type { DailyPlanetLongitudes } from '@/lib/ephemeris/astronomia-adapter'

interface Props {
  /** Today's longitudes — always provided. */
  transit: DailyPlanetLongitudes
  /** Natal longitudes if the user has a chart on file. Optional. */
  natal?: PlanetMap | null
}

// Map our DailyPlanetLongitudes shape (sun/moon/mercury/...) to the
// EphemerisWheel's GlyphKey-typed PlanetMap.
function asPlanetMap(l: DailyPlanetLongitudes): PlanetMap {
  return {
    sun: l.sun,
    moon: l.moon,
    mercury: l.mercury,
    venus: l.venus,
    mars: l.mars,
    jupiter: l.jupiter,
    saturn: l.saturn,
    uranus: l.uranus,
    neptune: l.neptune,
    pluto: l.pluto,
  }
}

export function MiniEphemeris({ transit, natal }: Props) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}
      >
        <Kicker color={K.copper}>Sky now</Kicker>
        <div
          style={{
            fontFamily: K.fMono,
            fontSize: 9,
            color: K.inkSoft,
            letterSpacing: '0.14em',
          }}
        >
          {natal ? 'NATAL · TRANSIT' : 'TRANSIT'}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <EphemerisWheel size={260} natal={natal ?? null} transit={asPlanetMap(transit)} aspects={[]} />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 10,
          fontFamily: K.fMono,
          fontSize: 9,
          color: K.inkSoft,
          letterSpacing: '0.14em',
        }}
      >
        {natal ? <span style={{ color: K.copperHi }}>◯ NATAL</span> : <span />}
        <span style={{ color: K.starlight }}>◌ TRANSIT</span>
        <span style={{ color: K.sage }}>— ASPECT</span>
      </div>
    </div>
  )
}
