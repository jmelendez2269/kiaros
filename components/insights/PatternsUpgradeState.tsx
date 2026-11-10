import Link from 'next/link'
import { formatPatternLabel } from '@/lib/journal/pattern-discoveries'

export const PATTERNS_UPGRADE_COPY = {
  title: 'Patterns come with Planner + Oracle',
  lead:
    'Planner + Oracle reads the entries you include next to the moon phase, retrogrades, and transits they were written under, and shows you the themes that keep coming back. Your journal works the same either way, with every entry stamped with the sky above it.',
  primaryCta: 'See Planner + Oracle',
} as const

export const PATTERNS_TEASER_COPY = {
  title: 'Your journal is already forming patterns',
  lead:
    'Every entry you write is stamped with the sky above it. These are the skies you have written under most often so far. Planner + Oracle opens what each one holds: the reading in your own words, the entries behind it, and where it falls across your year.',
  locked: 'The reading and the entries behind it open with Planner + Oracle.',
} as const

export type PatternTeaserRow = { id: string; pattern_type: string; pattern_key: string; sample_size: number; last_seen: string | null }

const TEASER_LIMIT = 3

function lastSeen(date: string | null): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`))
}

/**
 * Shown to members without Stelloquy access. With `patterns`, it names the
 * skies their own journal keeps returning to, and keeps the readings and
 * entries behind the upgrade. Without any, it explains what Patterns is.
 */
export function PatternsUpgradeState({ patterns = [] }: { patterns?: PatternTeaserRow[] }) {
  const shown = [...patterns].sort((a, b) => b.sample_size - a.sample_size).slice(0, TEASER_LIMIT)
  const more = patterns.length - shown.length
  const copy = shown.length ? PATTERNS_TEASER_COPY : PATTERNS_UPGRADE_COPY
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <section className="shell-panel-hero w-full p-8 md:p-10">
        <h1 className="shell-hero-title max-w-3xl">{copy.title}</h1>
        <p className="shell-prose-lead mt-4 max-w-3xl">{copy.lead}</p>

        {shown.length ? (
          <>
            <ul className="mt-8 grid gap-3 sm:grid-cols-3" style={{ listStyle: 'none', padding: 0 }}>
              {shown.map((pattern) => {
                const seen = lastSeen(pattern.last_seen)
                return (
                  <li key={pattern.id} className="channel-ai rounded-2xl border border-border/70 bg-stone-950/50 p-5">
                    <p className="font-display text-[1.25rem] leading-tight text-bone">
                      {formatPatternLabel(pattern.pattern_type, pattern.pattern_key)}
                    </p>
                    <p className="mt-2 text-sm text-bone-muted">
                      {pattern.sample_size} {pattern.sample_size === 1 ? 'entry' : 'entries'}
                      {seen ? ` · last on ${seen}` : ''}
                    </p>
                    <div aria-hidden className="mt-4 space-y-2">
                      <span className="block h-2 w-full rounded-full bg-bone/10" />
                      <span className="block h-2 w-4/5 rounded-full bg-bone/10" />
                      <span className="block h-2 w-3/5 rounded-full bg-bone/10" />
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="mt-4 text-sm text-bone-muted">
              {more > 0 ? `And ${more} more. ` : ''}
              {PATTERNS_TEASER_COPY.locked}
            </p>
          </>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing#tiers"
            className="inline-flex items-center rounded-full bg-leather-300 px-5 py-3 text-sm font-semibold text-stone-950"
          >
            {PATTERNS_UPGRADE_COPY.primaryCta}
          </Link>
          {shown.length ? (
            <Link
              href="/journal"
              className="inline-flex items-center rounded-full border border-border/70 px-5 py-3 text-sm font-medium text-bone"
            >
              Keep writing
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  )
}
