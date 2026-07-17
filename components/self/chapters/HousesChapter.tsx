import Link from 'next/link'
import { HOUSE_MEANING } from '@/lib/human-design'
import type { NatalChart, Planet } from '@/types/blueprint'

interface Props {
  natalChart: NatalChart
  birthTimeKnown: boolean
}

const PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
]

export function HousesChapter({ natalChart, birthTimeKnown }: Props) {
  return (
    <section id="houses" className="scroll-mt-10 space-y-6">
      <div>
        <p className="shell-kicker mb-2">Chapter II</p>
        <h2 className="font-serif text-3xl italic text-bone">Houses</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
          The twelve rooms of the chart — where each planet&apos;s energy plays out.
        </p>
      </div>

      {!birthTimeKnown ? (
        <div
          id="ascendant"
          className="scroll-mt-10 rounded-xl border border-amber-400/30 bg-amber-500/[0.06] px-5 py-4"
        >
          <p className="text-sm font-medium text-bone">Houses need a known birth time</p>
          <p className="mt-2 text-sm leading-6 text-bone-muted">
            House placements shift as the sky turns through the day, so without a known birth
            time this chapter would be a guess. Add your birth time in settings and the ascendant
            and houses will appear here.
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-block text-sm text-leather-200 underline underline-offset-2"
          >
            Update birth time
          </Link>
        </div>
      ) : (
        <>
          <div id="ascendant" className="scroll-mt-10 rounded-xl border border-border/50 bg-stone-950/50 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.16em] text-bone-muted/60">Rising · Ascendant</p>
            <p className="mt-1.5 font-serif text-xl italic text-bone">{natalChart.rising} rising</p>
            <p className="mt-1 text-sm leading-6 text-bone-muted">
              How you show up — your body, your style, the way you enter a room.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
              const occupants = PLANETS.filter(
                (p) => natalChart[p.toLowerCase() as Lowercase<Planet>].house === house,
              )
              const meaning = HOUSE_MEANING[house]
              return (
                <div key={house} className="rounded-xl border border-border/50 bg-stone-950/50 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-serif text-base text-bone">House {house}</p>
                    {occupants.length > 0 ? (
                      <span className="font-mono text-xs text-leather-200">{occupants.join(', ')}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-bone-muted">{meaning.long}</p>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
