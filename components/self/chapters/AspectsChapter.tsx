import { ASPECT_PLAIN } from '@/lib/human-design'
import type { NatalAspect } from '@/lib/ephemeris/natal-aspects'

interface Props {
  natalAspects: NatalAspect[]
}

const TONE_CLASS: Record<'tense' | 'easy' | 'neutral', string> = {
  tense: 'text-rose-300',
  easy: 'text-emerald-300',
  neutral: 'text-bone-muted',
}

export function AspectsChapter({ natalAspects }: Props) {
  return (
    <section id="aspects" className="scroll-mt-10 space-y-6">
      <div>
        <p className="shell-kicker mb-2">Chapter III</p>
        <h2 className="font-serif text-3xl italic text-bone">Aspects</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
          The angles between your planets — where energies merge, support each other, or ask for
          something to be worked through.
        </p>
      </div>

      {natalAspects.length === 0 ? (
        <p className="text-sm text-bone-muted">No tight aspects within orb in this chart.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {natalAspects.map((asp) => {
            const meta = ASPECT_PLAIN[asp.aspect]
            return (
              <li
                key={`${asp.a}-${asp.aspect}-${asp.b}`}
                className="rounded-xl border border-border/50 bg-stone-950/50 px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-bone">
                    {asp.a} {asp.aspect} {asp.b}
                  </span>
                  <span className="font-mono text-xs text-bone-muted">{asp.orb.toFixed(1)}° orb</span>
                </div>
                <p className={`mt-1 text-xs leading-5 ${TONE_CLASS[meta.tone]}`}>{meta.plain}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
