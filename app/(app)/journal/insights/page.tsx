import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Json, Tables } from '@/types/database'

type PatternRow = Pick<
  Tables<'user_pattern_insights'>,
  'id'
  | 'pattern_type'
  | 'pattern_key'
  | 'sample_size'
  | 'confidence'
  | 'first_seen'
  | 'last_seen'
  | 'summary'
  | 'evidence'
  | 'updated_at'
>

type EvidenceEntry = {
  entry_id: string
  entry_date: string
  title: string | null
}

const TYPE_ORDER = ['lunar_phase', 'lunar_sign', 'aspect', 'retrograde'] as const
type PatternType = (typeof TYPE_ORDER)[number]

const SECTION_META: Record<PatternType, { kicker: string; title: string; lede: string }> = {
  lunar_phase: {
    kicker: 'Lunar phase',
    title: 'How you write across the moon',
    lede: 'Which phases of the moon you tend to journal under, and what that has looked like over time.',
  },
  lunar_sign: {
    kicker: 'Lunar sign',
    title: 'The signs the moon was passing through',
    lede: 'Recurring zodiac signatures the moon has been moving through when you reach for the journal.',
  },
  aspect: {
    kicker: 'Transit aspects',
    title: 'Transits that keep showing up in your entries',
    lede: 'Active aspects between moving planets and your natal chart on the days you wrote.',
  },
  retrograde: {
    kicker: 'Retrogrades',
    title: 'Retrograde windows you have written through',
    lede: 'Which planets were retrograde at the time of each entry. Useful for spotting your own retrograde rhythm.',
  },
}

function patternLabel(type: string, key: string): string {
  if (type === 'aspect') return key.split(':').join(' ')
  if (type === 'lunar_phase') return `${key} Moon`
  if (type === 'lunar_sign') return `Moon in ${key}`
  if (type === 'retrograde') return `${key} retrograde`
  return key
}

function parseEvidence(value: Json): EvidenceEntry[] {
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

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800/80"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-leather-400/80" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs uppercase tracking-[0.16em] text-bone-muted/70">{pct}%</span>
    </div>
  )
}

function PatternCard({ pattern }: { pattern: PatternRow }) {
  const evidence = parseEvidence(pattern.evidence)
  const label = patternLabel(pattern.pattern_type, pattern.pattern_key)
  const range = formatRange(pattern.first_seen, pattern.last_seen)

  return (
    <article className="shell-panel-soft flex h-full flex-col gap-4 rounded-[1.25rem] border border-border/70 bg-stone-950/60 px-5 py-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[1.05rem] font-semibold leading-snug text-bone">{label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-bone-muted/55">{range}</p>
        </div>
        <span className="shell-pill shrink-0">
          {pattern.sample_size} {pattern.sample_size === 1 ? 'entry' : 'entries'}
        </span>
      </header>

      <ConfidenceBar value={pattern.confidence} />

      <p className="text-sm leading-7 text-bone-muted">{pattern.summary}</p>

      {evidence.length > 0 && (
        <div className="border-t border-border/60 pt-3">
          <p className="text-xs uppercase tracking-[0.16em] text-bone-muted/55">Recent evidence</p>
          <ul className="mt-2 space-y-1.5">
            {evidence.map((entry) => (
              <li key={entry.entry_id} className="text-sm text-bone-muted">
                <Link
                  href={`/journal?entry=${entry.entry_id}`}
                  className="text-bone underline decoration-leather-400/40 underline-offset-4 transition-colors hover:decoration-leather-300"
                >
                  {entry.title?.trim() || 'Untitled entry'}
                </Link>
                <span className="ml-2 text-xs uppercase tracking-[0.16em] text-bone-muted/55">{entry.entry_date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

const MIN_ENTRIES_FOR_INSIGHTS = 10

export default async function JournalInsightsPage() {
  const supabase = await createServerSupabase()

  const [patternsRes, entryCountRes] = await Promise.all([
    supabase
      .from('user_pattern_insights')
      .select(
        'id, pattern_type, pattern_key, sample_size, confidence, first_seen, last_seen, summary, evidence, updated_at',
      )
      .order('sample_size', { ascending: false })
      .order('last_seen', { ascending: false }),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
  ])

  const patterns = (patternsRes.data ?? []) as PatternRow[]
  const journalEntriesCount = entryCountRes.error ? 0 : entryCountRes.count ?? 0

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    rows: patterns.filter((p) => p.pattern_type === type),
  })).filter((group) => group.rows.length > 0)

  const showEarlyState = journalEntriesCount < MIN_ENTRIES_FOR_INSIGHTS && patterns.length === 0
  const showQuietState = !showEarlyState && patterns.length === 0

  return (
    <div className="space-y-8">
      <section className="shell-panel px-6 py-7 md:px-8">
        <p className="shell-kicker mb-3">Journal intelligence</p>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="shell-section-title">Patterns we have noticed in your journaling</h1>
            <p className="mt-4 text-base leading-7 text-bone-muted">
              Every time you save an entry, Kiaros records the sky that day — moon phase, moon sign, active aspects to your
              natal chart, and any retrogrades. Over time, the entries cluster. Below is a read of what is recurring, with the
              actual entries each pattern is built from. Treat these as observed personal evidence, not a fixed rule.
            </p>
          </div>
          <div className="shell-panel-soft px-4 py-3 text-sm text-bone-muted">
            <p className="text-xs uppercase tracking-[0.16em] text-bone-muted/55">Entries on file</p>
            <p className="mt-1 text-lg font-semibold text-bone">{journalEntriesCount}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-stone-950/60 px-4 py-2 text-sm font-medium text-bone transition-colors hover:border-leather-400/35 hover:bg-leather-500/8"
          >
            ← Back to journal
          </Link>
        </div>
      </section>

      {showEarlyState && (
        <section className="shell-panel px-6 py-10 text-center md:px-8">
          <h2 className="text-[1.6rem] font-semibold text-bone">Patterns surface as the journal grows</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-bone-muted">
            You have {journalEntriesCount} {journalEntriesCount === 1 ? 'entry' : 'entries'} so far. Once a few more land —
            ideally across different moon phases — Kiaros will start surfacing the rhythms it sees. Nothing here yet is
            wrong; there is just not enough lived evidence to call anything a pattern.
          </p>
          <Link
            href="/journal"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-leather-500/90 px-5 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-leather-400"
          >
            Write an entry
          </Link>
        </section>
      )}

      {showQuietState && (
        <section className="shell-panel px-6 py-10 text-center md:px-8">
          <h2 className="text-[1.6rem] font-semibold text-bone">No patterns yet</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-bone-muted">
            Your entries are recorded with sky context, but nothing has recurred often enough yet to call out as a pattern.
            Keep writing — the picture sharpens as the moon moves.
          </p>
        </section>
      )}

      {grouped.map(({ type, rows }) => {
        const meta = SECTION_META[type]
        return (
          <section key={type} className="shell-panel px-6 py-7 md:px-8">
            <header className="flex flex-col gap-2">
              <p className="shell-kicker">{meta.kicker}</p>
              <h2 className="text-[1.8rem] font-semibold text-bone">{meta.title}</h2>
              <p className="text-sm leading-7 text-bone-muted">{meta.lede}</p>
            </header>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
