import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { CaptureGraph } from '@/components/insights/CaptureGraph'
import {
  PatternInsights,
  parseEvidence,
  type PatternRow,
} from '@/components/insights/PatternInsights'
import { JournalHistoryList, type RecentJournalEntry } from '@/components/insights/JournalHistoryList'
import { CaptureHistoryList, type OracleCaptureRow } from '@/components/insights/CaptureHistoryList'
import { InsightsTabs } from '@/components/insights/InsightsTabs'
import { InsightsPollingShell } from '@/components/journal/InsightsPollingShell'
import { DEFAULT_VOICE_KEY, VOICE_PRESETS } from '@/lib/ai/journal-insight-synthesis'
import { BRAND } from '@/lib/brand'
import { isJournalConsentV2Enabled } from '@/lib/feature-flags'

export const metadata = {
  title: `Patterns — ${BRAND.product}`,
  description: 'Everything Stelloquy and your journal have noticed — recurring moons, transits, saved entries, saved conversations, and the living mind map.',
}

export default async function PatternsPage() {
  const supabase = await createServerSupabase()
  const consentV2Enabled = isJournalConsentV2Enabled()

  const [patternsRes, entryCountRes, settingsRes, entriesRes, oracleCapturesRes] = await Promise.all([
    supabase
      .from('user_pattern_insights')
      .select(
        'id, pattern_type, pattern_key, sample_size, confidence, first_seen, last_seen, summary, evidence, updated_at, ai_summary, ai_summary_voice_label, ai_synthesizing_at',
      )
      .order('sample_size', { ascending: false })
      .order('last_seen', { ascending: false }),
    supabase.from('journal_entries').select('id', { count: 'exact', head: true }),
    supabase
      .from('user_settings')
      .select('journal_insight_voice, journal_insight_voice_label')
      .maybeSingle(),
    supabase
      .from('journal_entries')
      .select('id, title, body, entry_date, is_ritual, created_at, oracle_memory, include_in_insights, include_in_stelloquy, memory_pinned, memory_importance, lunar_phase, lunar_sign, transit_context')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('oracle_captures')
      .select('id, captured_text, source_role, include_in_insights, include_in_planner, thread_messages, tradition, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const patterns = (patternsRes.data ?? []) as PatternRow[]
  const settingsRow = settingsRes.data
  const journalEntriesCount = entryCountRes.error ? 0 : entryCountRes.count ?? 0
  const recentEntries = (entriesRes.data ?? []) as RecentJournalEntry[]
  const oracleCaptures = (oracleCapturesRes.data ?? []) as OracleCaptureRow[]

  const evidenceEntryIds = Array.from(
    new Set(patterns.flatMap((p) => parseEvidence(p.evidence).map((e) => e.entry_id))),
  )
  const bodyByEntryId = new Map<string, string>()
  if (evidenceEntryIds.length > 0) {
    let entryBodiesQuery = supabase
      .from('journal_entries')
      .select('id, body')
      .in('id', evidenceEntryIds)

    if (consentV2Enabled) {
      entryBodiesQuery = entryBodiesQuery.eq('include_in_insights', true)
    }

    const { data: entryBodies } = await entryBodiesQuery
    for (const row of entryBodies ?? []) {
      const id = row.id as unknown as string | null
      const body = (row.body as unknown as string | null) ?? null
      if (id && body) bodyByEntryId.set(id, body)
    }
  }

  const inFlightCount = patterns.filter((p) => Boolean(p.ai_synthesizing_at)).length

  const savedVoiceLabel = settingsRow?.journal_insight_voice_label ?? VOICE_PRESETS[DEFAULT_VOICE_KEY].label

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <InsightsPollingShell initialInFlight={inFlightCount}>
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="channel-ai channel-kicker mb-2.5">Patterns</p>
            <h1 className="shell-hero-title">Everything {BRAND.product} has noticed</h1>
            <p className="mt-4 shell-prose">
              Observed personal evidence drawn from your entries and captures — not a fixed rule.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="channel-mine">
              <p className="channel-kicker">Entries on file</p>
              <p className="mt-1 font-display text-[1.75rem] leading-none text-bone">{journalEntriesCount}</p>
            </div>
            <Link
              href="/journal"
              className="inline-flex items-center gap-2 self-end rounded-full border border-border/70 bg-stone-950/60 px-4 py-2 text-sm font-medium text-bone transition-colors hover:border-moss-400/40 hover:bg-moss-500/8"
            >
              ← Journal
            </Link>
          </div>
        </header>

        <InsightsTabs
          counts={{
            patterns: patterns.length,
            journal: recentEntries.length,
            captures: oracleCaptures.length,
          }}
          patterns={
            <PatternInsights
              patterns={patterns}
              bodyByEntryId={bodyByEntryId}
              journalEntriesCount={journalEntriesCount}
              voiceLabel={savedVoiceLabel}
            />
          }
          map={
            <section className="space-y-4">
              <header className="max-w-2xl space-y-2">
                <h2 className="font-display text-[1.4rem] text-bone">
                  The shape of what you keep circling back to
                </h2>
                <p className="shell-prose text-sm">
                  Every Stelloquy capture is tagged across five axes — themes, natal aspects, transit aspects, Human
                  Design elements, and the moods you named. Nodes grow with frequency. Edges connect tags that appeared
                  in the same capture.
                </p>
              </header>
              <CaptureGraph />
            </section>
          }
          journal={
            <section className="space-y-2">
              <header className="max-w-2xl space-y-2">
                <h2 className="font-display text-[1.4rem] text-bone">Your saved reflections</h2>
                <p className="shell-prose text-sm">
                  Revisit past entries, rituals, and timing-window notes in one place.
                </p>
              </header>
              <JournalHistoryList
                entries={recentEntries}
                consentV2Enabled={consentV2Enabled}
              />
            </section>
          }
          captures={
            <section className="space-y-2">
              <header className="max-w-2xl space-y-2">
                <h2 className="font-display text-[1.4rem] text-bone">Conversation fragments</h2>
                <p className="shell-prose text-sm">
                  Highlighted Stelloquy moments and saved full threads. Anything marked for insights is included in
                  future Stelloquy context — and saved threads can be reopened to read the whole conversation.
                </p>
              </header>
              <CaptureHistoryList captures={oracleCaptures} />
            </section>
          }
        />
      </InsightsPollingShell>
    </div>
  )
}
