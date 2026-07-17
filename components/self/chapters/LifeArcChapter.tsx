import type { LifeArcResult } from '@/lib/today/get-life-arc'

interface Props {
  lifeArc: LifeArcResult
}

export function LifeArcChapter({ lifeArc }: Props) {
  return (
    <section id="life-arc" className="scroll-mt-10 space-y-6">
      <div>
        <p className="shell-kicker mb-2">Chapter V</p>
        <h2 className="font-serif text-3xl italic text-bone">Life Arc</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-bone-muted">
          The multi-year currents moving through your chart right now — the slowest planets, the
          ones that shape an era rather than a week.
        </p>
      </div>

      {lifeArc.status === 'no-chart' ? (
        <p className="text-sm text-bone-muted">
          Your yearly ephemeris hasn&apos;t been generated yet — this chapter fills in once your
          blueprint is ready.
        </p>
      ) : lifeArc.status === 'quiet' ? (
        <p className="text-sm text-bone-muted">
          No rare or once-in-a-lifetime transits are active right now — a quieter stretch, worth
          noticing on its own terms.
        </p>
      ) : (
        <>
          <p className="font-serif text-xl italic text-bone">{lifeArc.headline}</p>
          <p className="text-sm leading-7 text-bone-muted">{lifeArc.cachedRead ?? lifeArc.fallback}</p>

          <ul className="grid gap-2 md:grid-cols-2">
            {lifeArc.heavy.map((h) => (
              <li
                key={h.technical}
                className="rounded-xl border border-border/50 bg-stone-950/50 px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-bone">{h.technical}</span>
                  <span className="font-mono text-xs text-bone-muted">{h.rarityLabel}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-bone-muted">
                  {h.periodLabel} · ends in {h.daysFromTodayToEnd} days
                </p>
              </li>
            ))}
          </ul>

          {lifeArc.hd ? (
            <div className="rounded-xl border border-border/50 bg-stone-950/50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-bone-muted/60">
                Held alongside your design
              </p>
              <p className="mt-1.5 text-sm text-bone">
                {lifeArc.hd.type} · {lifeArc.hd.profile} ({lifeArc.hd.profileName})
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
