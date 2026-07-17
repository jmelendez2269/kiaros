import { buildNatalPlacementExplanation } from '@/lib/human-design'
import { getSabianForDegree } from '@/lib/ephemeris/sabian'
import type { NatalChart, Planet } from '@/types/blueprint'

interface Props {
  natalChart: NatalChart
  birthTimeKnown: boolean
}

const PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]

export function IdentityChapter({ natalChart, birthTimeKnown }: Props) {
  return (
    <section id="identity" className="scroll-mt-10 space-y-8">
      <div>
        <p className="shell-kicker mb-2">Chapter I</p>
        <h2 className="font-serif text-3xl italic text-bone">Identity</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
          Ten placements, the sky at the moment you arrived. Each one is a lens, not a label.
        </p>
      </div>

      <div className="space-y-10">
        {PLANETS.map((planet) => {
          const position = natalChart[planet.toLowerCase() as Lowercase<Planet>]
          const explanation = buildNatalPlacementExplanation({
            planet,
            sign: position.sign,
            degreeInSign: position.degree,
            house: birthTimeKnown ? position.house : undefined,
            isRetrograde: position.retrograde,
            aspects: [],
          })
          const sabian = getSabianForDegree(position.longitude)
          const glyphKey = planet.toLowerCase()

          return (
            <article key={planet} id={glyphKey} className="scroll-mt-10 border-t border-border/60 pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-xl text-bone">
                  {planet} in {position.sign}
                  {position.retrograde ? <span className="ml-2 text-sm text-bone-muted">℞</span> : null}
                </h3>
                <span className="font-mono text-xs text-bone-muted">
                  {position.degree.toFixed(1)}° {position.sign}
                  {birthTimeKnown ? ` · House ${position.house}` : ''}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-bone-muted">{explanation.planetMeaning.long}</p>
              <p className="mt-1 text-sm leading-6 text-bone-muted">
                In {position.sign}: {explanation.signMeaning}.
              </p>
              {explanation.houseMeaning ? (
                <p className="mt-1 text-sm leading-6 text-bone-muted">
                  House {position.house}: {explanation.houseMeaning.long}
                </p>
              ) : null}
              <div className="mt-3 rounded-xl border border-border/50 bg-stone-950/50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-bone-muted/60">
                  Sabian symbol · {sabian.position}
                </p>
                <p className="mt-1.5 font-serif italic text-bone">{sabian.symbol}</p>
                {sabian.interpretation ? (
                  <p className="mt-1 text-xs leading-5 text-bone-muted">{sabian.interpretation}</p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
