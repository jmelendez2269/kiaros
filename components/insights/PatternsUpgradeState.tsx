import Link from 'next/link'

/** COPY_OWNER: replace PLACEHOLDER strings before launch. */
export const PATTERNS_UPGRADE_COPY = {
  kicker: 'PLACEHOLDER — Patterns kicker',
  title: 'PLACEHOLDER — Patterns upgrade headline',
  lead: 'PLACEHOLDER — Short explanation that Patterns (journal sky themes, captures mind map, and pattern voice) require active Planner + Oracle access.',
  readOnlyNote:
    'PLACEHOLDER — Note for read-only planner users that their journal remains readable but Patterns needs active Planner + Oracle.',
  primaryCta: 'PLACEHOLDER — Primary CTA label',
  secondaryCta: 'PLACEHOLDER — Secondary CTA label',
} as const

export function PatternsUpgradeState({
  hasReadOnlyPlannerAccess,
}: {
  hasReadOnlyPlannerAccess: boolean
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <section className="shell-panel-hero w-full p-8 md:p-10">
        <p className="shell-kicker mb-4">{PATTERNS_UPGRADE_COPY.kicker}</p>
        <h1 className="shell-hero-title max-w-3xl">{PATTERNS_UPGRADE_COPY.title}</h1>
        <p className="shell-prose-lead mt-4 max-w-3xl">{PATTERNS_UPGRADE_COPY.lead}</p>

        {hasReadOnlyPlannerAccess ? (
          <p className="mt-6 rounded-[1rem] border border-leather-500/25 bg-leather-500/10 px-4 py-3 text-sm leading-6 text-bone-muted">
            {PATTERNS_UPGRADE_COPY.readOnlyNote}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing#tiers"
            className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
          >
            {PATTERNS_UPGRADE_COPY.primaryCta}
          </Link>
          <Link
            href="/stelloquy"
            className="inline-flex items-center rounded-full border border-border/80 px-5 py-3 text-sm font-semibold text-bone"
          >
            {PATTERNS_UPGRADE_COPY.secondaryCta}
          </Link>
        </div>
      </section>
    </div>
  )
}
