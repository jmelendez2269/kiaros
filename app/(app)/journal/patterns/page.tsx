import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PatternsUpgradeState } from '@/components/insights/PatternsUpgradeState'
import { PatternInsights } from '@/components/insights/PatternInsights'
import { CaptureHistoryList } from '@/components/insights/CaptureHistoryList'
import { ConsentEmptyState } from '@/components/insights/ConsentEmptyState'
import { CheckInRhythms } from '@/components/insights/CheckInRhythms'
import { InsightsPollingShell } from '@/components/journal/InsightsPollingShell'
import { loadPatternsPageData } from '@/lib/journal/load-patterns-page-data'
import { resolvePatternsSubView } from '@/lib/journal/ia-journal-routes'
import { isIaJournalEnabled } from '@/lib/feature-flags'
import { BRAND } from '@/lib/brand'
import { PageHints } from '@/components/tour/PageHints'

export const metadata = {
  title: `Patterns — ${BRAND.product}`,
  description: 'Everything Stelloquy and your journal have noticed.',
}

export default async function JournalPatternsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>
}) {
  if (!isIaJournalEnabled()) {
    redirect('/insights/map')
  }

  const params = (await searchParams) ?? {}
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view
  const subView = resolvePatternsSubView(rawView ?? null)
  // The mind map has its own page now.
  if (subView === 'map') redirect('/insights/mind-map')

  const data = await loadPatternsPageData()

  if (!data.hasOracleAccess) {
    // Names and counts only: the readings and the entries behind them stay with Stelloquy access.
    return <PatternsUpgradeState patterns={data.showEmptyState ? [] : data.patterns} />
  }

  const patternsBody =
    data.showEmptyState ? (
      <ConsentEmptyState variant="patterns" />
    ) : (
      <PatternInsights
        patterns={data.patterns}
        bodyByEntryId={data.bodyByEntryId}
        journalEntriesCount={data.journalEntriesCount}
        voiceLabel={data.savedVoiceLabel}
        skyYear={data.skyYear}
        skyDaysByPatternId={data.skyDaysByPatternId}
      />
    )

  const capturesBody = (
    <section className="space-y-2">
      <header className="max-w-2xl space-y-2">
        <h2 className="font-display text-[1.4rem] text-bone">Conversation fragments</h2>
        <p className="shell-prose text-sm">
          Highlighted Stelloquy moments and saved full threads. Anything marked for insights is included in future
          Stelloquy context — and saved threads can be reopened to read the whole conversation.
        </p>
      </header>
      <CaptureHistoryList captures={data.oracleCaptures} memoryDefaultsEnabled={data.memoryDefaultsEnabled} />
    </section>
  )

  const content =
    subView === 'captures' ? capturesBody : patternsBody

  return (
    <div className="space-y-8">
      <InsightsPollingShell initialInFlight={data.inFlightCount}>
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="channel-ai channel-kicker mb-2.5">Patterns</p>
            <h2 className="shell-hero-title">Everything {BRAND.product} has noticed</h2>
            <p className="mt-4 shell-prose">
              Observed personal evidence drawn from your entries and captures — not a fixed rule.
            </p>
          </div>
          <Link
            href="/journal"
            className="inline-flex items-center gap-2 self-end rounded-full border border-border/70 bg-stone-950/60 px-4 py-2 text-sm font-medium text-bone transition-colors hover:border-moss-400/40 hover:bg-moss-500/8"
          >
            ← Write
          </Link>
        </header>
        {subView === 'patterns' ? <PageHints page="patterns" /> : null}
        {content}
        {subView === 'patterns' ? <CheckInRhythms /> : null}
      </InsightsPollingShell>
    </div>
  )
}
