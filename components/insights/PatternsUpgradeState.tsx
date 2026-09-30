import Link from 'next/link'

export const PATTERNS_UPGRADE_COPY = {
  title: 'Patterns come with Planner + Oracle',
  lead:
    'Planner + Oracle reads the entries you include next to the moon phase, retrogrades, and transits they were written under, and shows you the themes that keep coming back. Your journal works the same either way, with every entry stamped with the sky above it.',
  primaryCta: 'See Planner + Oracle',
} as const

export function PatternsUpgradeState({
  hasReadOnlyPlannerAccess,
}: {
  hasReadOnlyPlannerAccess: boolean
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <section className="shell-panel-hero w-full p-8 md:p-10">
        <h1 className="shell-hero-title max-w-3xl">{PATTERNS_UPGRADE_COPY.title}</h1>
        <p className="shell-prose-lead mt-4 max-w-3xl">{PATTERNS_UPGRADE_COPY.lead}</p>

        {hasReadOnlyPlannerAccess ? (
          <p className="mt-6 rounded-[1rem] border border-leather-500/25 bg-leather-500/10 px-4 py-3 text-sm leading-6 text-bone-muted">
            Your previous annual planner remains readable, but Patterns require active Planner + Oracle
            access.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing#tiers"
            className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
          >
            {PATTERNS_UPGRADE_COPY.primaryCta}
          </Link>
        </div>
      </section>
    </div>
  )
}
