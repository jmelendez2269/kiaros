'use client'

import { useMemo } from 'react'
import { EphemerisWheel } from '@/components/almanac/EphemerisWheel'
import type { GlyphKey } from '@/components/almanac/tokens'
import { useActiveAnchor } from './use-active-anchor'
import { ChapterQuarterFooter } from './ChapterQuarterFooter'
import { IdentityChapter } from './chapters/IdentityChapter'
import { HousesChapter } from './chapters/HousesChapter'
import { AspectsChapter } from './chapters/AspectsChapter'
import { DesignChapter } from './chapters/DesignChapter'
import { LifeArcChapter } from './chapters/LifeArcChapter'
import { AreasChapter } from './chapters/AreasChapter'
import type { HumanDesignChart } from '@/lib/human-design'
import type { LifeArcResult } from '@/lib/today/get-life-arc'
import type { NatalAspect } from '@/lib/ephemeris/natal-aspects'
import type { NatalChart, Planet, WeekBlueprint } from '@/types/blueprint'
import type { AreaDefinition } from '@/lib/areas'

export interface AreaPreview {
  id: string
  name: string
  iconKey: string | null
  summary: string
  slug: string
  energyMode: AreaDefinition['energyMode']
  currentWindow: WeekBlueprint | null
  houseDetails: { house: number; sign: string | null }[]
}

interface Props {
  displayName: string | null
  birthCity: string | null
  natalChart: NatalChart
  natalAspects: NatalAspect[]
  hdChart: HumanDesignChart | null
  birthTimeKnown: boolean
  lifeArc: LifeArcResult
  areaPreviews: AreaPreview[]
  currentQuarter: { number: number; theme: string } | null
}

const PLANET_KEYS: { planet: Planet; glyph: GlyphKey }[] = [
  { planet: 'Sun', glyph: 'sun' },
  { planet: 'Moon', glyph: 'moon' },
  { planet: 'Mercury', glyph: 'mercury' },
  { planet: 'Venus', glyph: 'venus' },
  { planet: 'Mars', glyph: 'mars' },
  { planet: 'Jupiter', glyph: 'jupiter' },
  { planet: 'Saturn', glyph: 'saturn' },
  { planet: 'Uranus', glyph: 'uranus' },
  { planet: 'Neptune', glyph: 'neptune' },
  { planet: 'Pluto', glyph: 'pluto' },
]

const CHAPTERS = [
  { id: 'identity', label: 'Identity' },
  { id: 'houses', label: 'Houses' },
  { id: 'aspects', label: 'Aspects' },
  { id: 'design', label: 'Design' },
  { id: 'life-arc', label: 'Life Arc' },
  { id: 'areas', label: 'Areas' },
] as const

const ANCHOR_TO_GLYPH: Record<string, GlyphKey> = {
  sun: 'sun',
  moon: 'moon',
  mercury: 'mercury',
  venus: 'venus',
  mars: 'mars',
  jupiter: 'jupiter',
  saturn: 'saturn',
  uranus: 'uranus',
  neptune: 'neptune',
  pluto: 'pluto',
  ascendant: 'ascendant',
}

export function SelfView({
  displayName,
  birthCity,
  natalChart,
  natalAspects,
  hdChart,
  birthTimeKnown,
  lifeArc,
  areaPreviews,
  currentQuarter,
}: Props) {
  const anchorIds = useMemo(() => {
    const ids: string[] = CHAPTERS.map((c) => c.id)
    ids.push(...PLANET_KEYS.map((p) => p.glyph))
    if (birthTimeKnown) ids.push('ascendant')
    return ids
  }, [birthTimeKnown])

  const activeAnchor = useActiveAnchor(anchorIds)
  const highlightKey = activeAnchor ? (ANCHOR_TO_GLYPH[activeAnchor] ?? null) : null
  const identityActive = PLANET_KEYS.some((p) => p.glyph === activeAnchor)

  const natal = useMemo(() => {
    const map: Partial<Record<GlyphKey, number>> = {}
    for (const { planet, glyph } of PLANET_KEYS) {
      map[glyph] = natalChart[planet.toLowerCase() as Lowercase<Planet>].longitude
    }
    if (birthTimeKnown && natalChart.ascendantLongitude != null) {
      map.ascendant = natalChart.ascendantLongitude
    }
    return map
  }, [natalChart, birthTimeKnown])

  const aspects = useMemo(
    () =>
      natalAspects.map((a) => ({
        a: natalChart[a.a.toLowerCase() as Lowercase<Planet>].longitude,
        b: natalChart[a.b.toLowerCase() as Lowercase<Planet>].longitude,
        kind: a.aspect,
      })),
    [natalAspects, natalChart],
  )

  return (
    <div className="mx-auto flex max-w-6xl gap-10 pb-24">
      <aside className="sticky top-10 hidden h-fit w-[22rem] shrink-0 lg:block">
        <div className="shell-panel flex flex-col items-center gap-6 px-6 py-8">
          <EphemerisWheel
            size={300}
            natal={natal}
            aspects={aspects}
            highlightKey={highlightKey}
            showHouses={birthTimeKnown}
          />
          <nav className="flex w-full flex-col gap-1">
            {CHAPTERS.map((c) => {
              const isActive = activeAnchor === c.id || (c.id === 'identity' && identityActive)
              return (
                <a
                  key={c.id}
                  href={`#${c.id}`}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? 'bg-leather-500/15 font-medium text-bone' : 'text-bone-muted hover:text-bone'
                  }`}
                >
                  {c.label}
                </a>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-20 pt-4">
        <header className="space-y-1.5">
          <p className="shell-kicker">Self · one reading</p>
          <h1 className="text-[1.85rem] font-semibold leading-tight text-bone md:text-[2.1rem]">
            {displayName ? `${displayName}'s chart` : 'Your chart'}
          </h1>
          <p className="max-w-3xl text-sm leading-7 text-bone-muted">
            Identity, houses, aspects, design, the arc of your life right now, and the areas
            you&apos;re building. Read it as one input among many — not a verdict.
            {birthCity ? (
              <span className="text-bone-muted/70"> Drawn from your birth in {birthCity}.</span>
            ) : null}
          </p>
        </header>

        <div>
          <IdentityChapter natalChart={natalChart} birthTimeKnown={birthTimeKnown} />
          <ChapterQuarterFooter quarter={currentQuarter} />
        </div>
        <div>
          <HousesChapter natalChart={natalChart} birthTimeKnown={birthTimeKnown} />
          <ChapterQuarterFooter quarter={currentQuarter} />
        </div>
        <div>
          <AspectsChapter natalAspects={natalAspects} />
          <ChapterQuarterFooter quarter={currentQuarter} />
        </div>
        <div>
          <DesignChapter chart={hdChart} displayName={displayName} birthCity={birthCity} />
          <ChapterQuarterFooter quarter={currentQuarter} />
        </div>
        <div>
          <LifeArcChapter lifeArc={lifeArc} />
          <ChapterQuarterFooter quarter={currentQuarter} />
        </div>
        <div>
          <AreasChapter previews={areaPreviews} />
          <ChapterQuarterFooter quarter={currentQuarter} />
        </div>
      </div>
    </div>
  )
}
