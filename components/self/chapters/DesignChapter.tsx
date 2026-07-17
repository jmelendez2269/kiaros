import Link from 'next/link'
import { HumanDesignView } from '@/components/human-design/HumanDesignView'
import { BodyGraph } from '@/components/self/BodyGraph'
import type { HumanDesignChart } from '@/lib/human-design'

interface Props {
  chart: HumanDesignChart | null
  displayName: string | null
  birthCity: string | null
}

export function DesignChapter({ chart, displayName, birthCity }: Props) {
  return (
    <section id="design" className="scroll-mt-10 space-y-6">
      <div>
        <p className="shell-kicker mb-2">Chapter IV</p>
        <h2 className="font-serif text-3xl italic text-bone">Design</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
          Human Design and Gene Keys — how you&apos;re wired to make decisions, recover energy,
          and meet the world.
        </p>
      </div>

      {!chart ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/[0.06] px-5 py-4">
          <p className="text-sm font-medium text-bone">Design needs a known birth time</p>
          <p className="mt-2 text-sm leading-6 text-bone-muted">
            Human Design gates shift every ~16 minutes, so without a known birth time the chart
            would be a guess. If you can find your time of birth, add it in settings and this
            chapter will appear.
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
          <div className="flex justify-center">
            <BodyGraph bodyGraph={chart.bodyGraph} size={260} />
          </div>
          <HumanDesignView chart={chart} displayName={displayName} birthCity={birthCity} />
        </>
      )}
    </section>
  )
}
