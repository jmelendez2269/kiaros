import Link from 'next/link'
import {
  ESTABLISHED_PATTERN_MIN_SAMPLE,
  formatPatternLabel,
} from '@/lib/journal/pattern-discoveries'
import type { Json, Tables } from '@/types/database'

export type PatternRow = Pick<
  Tables<'user_pattern_insights'>,
  | 'id'
  | 'pattern_type'
  | 'pattern_key'
  | 'sample_size'
  | 'confidence'
  | 'first_seen'
  | 'last_seen'
  | 'summary'
  | 'evidence'
  | 'updated_at'
  | 'ai_summary'
  | 'ai_summary_voice_label'
  | 'ai_synthesizing_at'
>

type EvidenceEntry = {
  entry_id: string
  entry_date: string
  title: string | null
}

const TYPE_ORDER = ['lunar_phase', 'lunar_sign', 'aspect', 'retrograde'] as const
type PatternType = (typeof TYPE_ORDER)[number]

const TYPE_LABEL: Record<PatternType, string> = {
  lunar_phase: 'Lunar phase',
  lunar_sign: 'Lunar sign',
  aspect: 'Transit aspects',
  retrograde: 'Retrogrades',
}

/**
 * A pattern earns the featured slot only once it has enough lived evidence
 * behind it. Everything thinner collapses into a one-line row so a handful of
 * two-entry coincidences can't crowd out a real signal.
 */
const MAX_FEATURED = 2

export function parseEvidence(value: Json): EvidenceEntry[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const record = item as Record<string, unknown>
    const entryId = typeof record.entry_id === 'string' ? record.entry_id : null
    const entryDate = typeof record.entry_date === 'string' ? record.entry_date : null
    if (!entryId || !entryDate) return []
    const title = typeof record.title === 'string' ? record.title : null
    return [{ entry_id: entryId, entry_date: entryDate, title }]
  })
}

function formatRange(first: string | null, last: string | null): string {
  if (!first && !last) return 'No date range yet'
  if (first && last && first === last) return first
  return `${first ?? '—'} → ${last ?? '—'}`
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}


/** The evidence list — the user's own entries, so it reads moss. */
function EvidenceList({
  evidence,
  bodyByEntryId,
  compact,
}: {
  evidence: EvidenceEntry[]
  bodyByEntryId: Map<string, string>
  compact?: boolean
}) {
  if (evidence.length === 0) return null

  return (
    <div className="channel-mine channel-rule pl-4">
      <p className="channel-kicker">Built from your entries</p>
      <ul className="mt-2.5 space-y-2.5">
        {evidence.map((entry) => {
          const body = bodyByEntryId.get(entry.entry_id)
          return (
            <li key={entry.entry_id} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <Link
                  href={`/journal?entry=${entry.entry_id}`}
                  className="text-bone underline decoration-moss-400/40 underline-offset-4 transition-colors hover:decoration-moss-300"
                >
                  {entry.title?.trim() || 'Untitled entry'}
                </Link>
                <span className="shrink-0 text-xs uppercase tracking-[0.16em] text-bone-muted/55">
                  {entry.entry_date}
                </span>
              </div>
              {body && !compact ? (
                <p className="mt-1 text-xs leading-6 text-bone-muted/85">{truncate(body, 160)}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The read itself is Kiaros's synthesis, so it renders in the leather channel. */
function PatternRead({ pattern }: { pattern: PatternRow }) {
  if (pattern.ai_summary) {
    return (
      <div>
        <p className="shell-prose-lead text-bone">{pattern.ai_summary}</p>
        {pattern.ai_summary_voice_label ? (
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-bone-muted/55">
            Voice · {pattern.ai_summary_voice_label}
          </p>
        ) : null}
      </div>
    )
  }

  if (pattern.ai_synthesizing_at) {
    return (
      <p className="flex items-center gap-2 text-sm leading-7 text-bone-muted">
        <span className="channel-dot animate-pulse" />
        Synthesising in your voice…
      </p>
    )
  }

  return <p className="text-sm leading-7 text-bone-muted">{pattern.summary}</p>
}

function FeaturedPattern({
  pattern,
  bodyByEntryId,
}: {
  pattern: PatternRow
  bodyByEntryId: Map<string, string>
}) {
  const evidence = parseEvidence(pattern.evidence)

  return (
    <article className="channel-panel flex flex-col gap-5 px-6 py-6 md:px-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="channel-kicker">{TYPE_LABEL[pattern.pattern_type as PatternType] ?? 'Pattern'}</p>
          <h3 className="mt-1.5 font-display text-[1.45rem] leading-tight text-bone">
            {formatPatternLabel(pattern.pattern_type, pattern.pattern_key)}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone-muted/55">
            {formatRange(pattern.first_seen, pattern.last_seen)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-[1.6rem] leading-none text-bone">{pattern.sample_size}</p>
          <p className="mt-1 text-[0.6rem] uppercase tracking-[0.2em] text-bone-muted/60">
            {pattern.sample_size === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </header>

      <p className="text-sm text-bone-muted">An observation from your recorded entries, not a measure of certainty.</p>

      <PatternRead pattern={pattern} />

      <EvidenceList evidence={evidence} bodyByEntryId={bodyByEntryId} />
    </article>
  )
}

/** Thin patterns: one scannable line that opens to the same detail on demand. */
function CompactPattern({
  pattern,
  bodyByEntryId,
}: {
  pattern: PatternRow
  bodyByEntryId: Map<string, string>
}) {
  const evidence = parseEvidence(pattern.evidence)

  return (
    <details className="group border-b border-border/40 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3 text-sm transition-colors hover:text-bone">
        <span className="channel-dot" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-bone">
          {formatPatternLabel(pattern.pattern_type, pattern.pattern_key)}
        </span>
        <span className="shrink-0 text-xs text-bone-muted/70">
          {pattern.sample_size} entries
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 text-xs text-bone-muted/50 transition-transform group-open:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="space-y-4 pb-5 pl-5 pr-1">
        <PatternRead pattern={pattern} />
        <EvidenceList evidence={evidence} bodyByEntryId={bodyByEntryId} compact />
      </div>
    </details>
  )
}

export const MIN_ENTRIES_FOR_INSIGHTS = 10

interface PatternInsightsProps {
  patterns: PatternRow[]
  bodyByEntryId: Map<string, string>
  journalEntriesCount: number
  voiceLabel: string
}

export function PatternInsights({
  patterns,
  bodyByEntryId,
  journalEntriesCount,
  voiceLabel,
}: PatternInsightsProps) {
  // Rows arrive sorted by sample_size then recency, so the featured slice is
  // simply the strongest few that clear the evidence bar.
  const featured = patterns
    .filter(
      (p) =>
        p.sample_size >= ESTABLISHED_PATTERN_MIN_SAMPLE,
    )
    .slice(0, MAX_FEATURED)

  const featuredIds = new Set(featured.map((p) => p.id))
  const rest = patterns.filter((p) => !featuredIds.has(p.id))

  const restByType = TYPE_ORDER.map((type) => ({
    type,
    rows: rest.filter((p) => p.pattern_type === type),
  })).filter((group) => group.rows.length > 0)

  if (patterns.length === 0) {
    const early = journalEntriesCount < MIN_ENTRIES_FOR_INSIGHTS
    return (
      <section className="shell-panel px-6 py-10 text-center md:px-8">
        <h2 className="font-display text-[1.5rem] text-bone">
          {early ? 'Patterns surface as the journal grows' : 'No patterns yet'}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-bone-muted">
          {early ? (
            <>
              You have {journalEntriesCount} {journalEntriesCount === 1 ? 'entry' : 'entries'} so far. Once a few more
              land — ideally across different moon phases — patterns will start surfacing here. Nothing here yet is
              wrong; there is just not enough lived evidence to call anything a pattern.
            </>
          ) : (
            <>
              Your entries are recorded with sky context, but nothing has recurred often enough yet to call out as a
              pattern. Keep writing — the picture sharpens as the moon moves.
            </>
          )}
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-8">
      {featured.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="shell-eyebrow">
              {featured.length === 1 ? 'Strongest signal' : 'Strongest signals'}
            </p>
            <Link
              href="/settings#insight-voice"
              className="text-xs text-bone-muted/70 underline decoration-border underline-offset-4 transition-colors hover:text-bone"
            >
              Voice · {voiceLabel}
            </Link>
          </div>
          <div className={featured.length > 1 ? 'grid gap-4 lg:grid-cols-2' : ''}>
            {featured.map((pattern) => (
              <FeaturedPattern key={pattern.id} pattern={pattern} bodyByEntryId={bodyByEntryId} />
            ))}
          </div>
        </section>
      ) : null}

      {restByType.length > 0 ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="shell-eyebrow">Also showing up</p>
            {featured.length === 0 ? (
              <Link
                href="/settings#insight-voice"
                className="text-xs text-bone-muted/70 underline decoration-border underline-offset-4 transition-colors hover:text-bone"
              >
                Voice · {voiceLabel}
              </Link>
            ) : null}
          </div>
          <div className="space-y-6">
            {restByType.map(({ type, rows }) => (
              <div key={type}>
                <p className="channel-kicker mb-1">{TYPE_LABEL[type]}</p>
                <div>
                  {rows.map((pattern) => (
                    <CompactPattern key={pattern.id} pattern={pattern} bodyByEntryId={bodyByEntryId} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
