import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { Frame, Kicker, K } from '@/components/almanac'
import { QuarterReviewPanel } from '@/components/year/QuarterReviewPanel'
import { loadCurrentBlueprint } from '@/lib/blueprint/load'
import { createAdminSupabase } from '@/lib/supabase/admin'
import { appProfileId, getAppProfile } from '@/lib/app/get-app-profile'
import { quarterlyReviewHref } from '@/lib/journal/ia-journal-routes'
import { isIaJournalEnabled, isPeriodReviewEnabled } from '@/lib/feature-flags'
import { formQuarterStatus, isFormQuarterlyReviewRow, type FormQuarterStatus } from '@/lib/reviews/quarter-review-row'
import { activityStatsSnapshotFromReviewRow, indexFormQuarterlyReviewsByQuarter } from '@/lib/reviews/quarterly-review-get'
import { PeriodReviewLookBackLinks } from '@/components/period-review/PeriodReviewLookBackLinks'

const QUARTER_MONTHS: Record<number, string> = {
  1: 'Jan – Mar',
  2: 'Apr – Jun',
  3: 'Jul – Sep',
  4: 'Oct – Dec',
}

const QUARTER_END_LABEL: Record<number, string> = {
  1: 'March 31',
  2: 'June 30',
  3: 'September 30',
  4: 'December 31',
}

function parseQuarter(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1 || n > 4) return fallback
  return Math.floor(n)
}

function currentQuarter(month0: number): number {
  return Math.floor(month0 / 3) + 1
}

type QuarterStatus = FormQuarterStatus

function quarterStatus(
  row: { completed_at: string | null; wins?: unknown; challenges?: unknown; pivots?: string | null; next_quarter_intentions?: string | null } | null,
  quarter: number,
  currentQ: number,
): QuarterStatus {
  return formQuarterStatus(row, quarter, currentQ)
}

function statusLabel(status: QuarterStatus): { label: string; tone: string } {
  switch (status) {
    case 'complete':
      return { label: 'COMPLETE', tone: K.sage }
    case 'draft':
      return { label: 'DRAFT', tone: K.copperHi }
    case 'future':
      return { label: 'FUTURE QUARTER', tone: K.inkSoft }
    case 'not-started':
    default:
      return { label: 'NOT STARTED', tone: K.inkDim }
  }
}

export async function JournalQuarterLookBack({ quarterParam }: { quarterParam?: string }) {
  const iaJournal = isIaJournalEnabled()
  const { userId } = await auth()
  if (!userId) return null
  const supabaseUserId = appProfileId(await getAppProfile(userId))
  if (!supabaseUserId) return null

  const loaded = await loadCurrentBlueprint(supabaseUserId)
  if (!loaded) {
    return (
      <p className="text-sm leading-7 text-bone-muted">
        Your quarterly review will appear here once your blueprint is ready.
      </p>
    )
  }

  const now = new Date()
  const currentQ = currentQuarter(now.getMonth())
  const selectedQuarter = parseQuarter(quarterParam, currentQ)

  const admin = createAdminSupabase()
  const reviewsRes = await admin
    .from('quarterly_reviews')
    .select(
      'quarter, completed_at, wins, challenges, pivots, next_quarter_intentions, ai_summary, stats_snapshot, created_at',
    )
    .eq('user_id', supabaseUserId)
    .eq('plan_year', loaded.planYear)
    .gte('quarter', 1)
    .lte('quarter', 4)

  const reviewsByQuarter = indexFormQuarterlyReviewsByQuarter(reviewsRes.data ?? [])

  const selectedReview = reviewsByQuarter.get(selectedQuarter) ?? null
  const quarterBlueprint = loaded.blueprint.quarters.find((q) => q.quarter === selectedQuarter)
  const selectedStatus = quarterStatus(selectedReview, selectedQuarter, currentQ)
  const selectedStatusMeta = statusLabel(selectedStatus)

  const priorCoords =
    selectedQuarter === 1
      ? { year: loaded.planYear - 1, quarter: 4 }
      : { year: loaded.planYear, quarter: selectedQuarter - 1 }
  let priorStatsSnapshot: Record<string, number> | null = null
  if (priorCoords.year === loaded.planYear) {
    const priorRow = reviewsByQuarter.get(priorCoords.quarter)
    priorStatsSnapshot = activityStatsSnapshotFromReviewRow(priorRow)
  } else {
    const priorYearRes = await admin
      .from('quarterly_reviews')
      .select('stats_snapshot, wins, challenges, pivots, next_quarter_intentions, completed_at')
      .eq('user_id', supabaseUserId)
      .eq('plan_year', priorCoords.year)
      .eq('quarter', priorCoords.quarter)
      .gte('quarter', 1)
      .lte('quarter', 4)
      .maybeSingle()
    if (isFormQuarterlyReviewRow(priorYearRes.data)) {
      priorStatsSnapshot = activityStatsSnapshotFromReviewRow(priorYearRes.data)
    }
  }
  const priorQuarterLabel = `Q${priorCoords.quarter}${
    priorCoords.year !== loaded.planYear ? ` ${priorCoords.year}` : ''
  }`

  let backfillQuarter: number | null = null
  for (let q = currentQ - 1; q >= 1; q--) {
    const row = reviewsByQuarter.get(q) ?? null
    if (quarterStatus(row, q, currentQ) === 'not-started') {
      backfillQuarter = q
      break
    }
  }
  const showBackfillNudge = backfillQuarter !== null && backfillQuarter !== selectedQuarter

  const completedDateLabel = selectedReview?.completed_at
    ? new Date(selectedReview.completed_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const reviewHref = (q: number) => {
    if (iaJournal) {
      return `/journal/look-back?view=quarter&quarter=${q}`
    }
    return quarterlyReviewHref(false, q)
  }

  return (
    <div
      style={{
        fontFamily: K.fBody,
        color: K.ink,
        background: K.bg,
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Kicker>Quarterly Review · {loaded.planYear}</Kicker>
          <div
            style={{
              fontFamily: K.fSerif,
              fontStyle: 'italic',
              fontSize: 32,
              color: K.ink,
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            Q{selectedQuarter} · {QUARTER_MONTHS[selectedQuarter]}
          </div>
          {quarterBlueprint?.theme ? (
            <div
              style={{
                fontFamily: K.fBody,
                fontSize: 13,
                color: K.inkDim,
                lineHeight: 1.6,
                marginTop: 10,
                maxWidth: 720,
              }}
            >
              {quarterBlueprint.theme}
            </div>
          ) : null}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: K.fMono,
              fontSize: 10,
              letterSpacing: '0.18em',
              color: selectedStatusMeta.tone,
            }}
          >
            {selectedStatusMeta.label}
          </div>
          {completedDateLabel ? (
            <div
              style={{
                fontFamily: K.fMono,
                fontSize: 9.5,
                color: K.inkSoft,
                marginTop: 4,
                letterSpacing: '0.14em',
              }}
            >
              {completedDateLabel.toUpperCase()}
            </div>
          ) : null}
        </div>
      </div>

      {showBackfillNudge && backfillQuarter !== null ? (
        <Link
          href={reviewHref(backfillQuarter)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 14px',
            border: `1px solid ${K.copper}55`,
            borderRadius: 10,
            background: K.bg2,
            textDecoration: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: K.fMono,
                fontSize: 10,
                letterSpacing: '0.16em',
                color: K.copperHi,
              }}
            >
              Q{backfillQuarter} · {QUARTER_MONTHS[backfillQuarter]}
            </span>
            <span style={{ fontFamily: K.fBody, fontSize: 13, color: K.ink, lineHeight: 1.5 }}>
              Wrapped on {QUARTER_END_LABEL[backfillQuarter]}. When you&rsquo;re ready, look back.
            </span>
          </div>
          <span
            style={{
              fontFamily: K.fMono,
              fontSize: 10,
              letterSpacing: '0.16em',
              color: K.copperHi,
            }}
          >
            OPEN →
          </span>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-2 min-[480px]:flex min-[480px]:gap-2">
        {[1, 2, 3, 4].map((q) => {
          const row = reviewsByQuarter.get(q) ?? null
          const status = quarterStatus(row, q, currentQ)
          const meta = statusLabel(status)
          const active = q === selectedQuarter
          return (
            <Link
              key={q}
              href={reviewHref(q)}
              className="min-[480px]:flex-1"
              style={{
                padding: '12px 14px',
                background: active ? K.bg2 : 'transparent',
                border: `1px solid ${active ? K.copper : K.line}`,
                borderRadius: 10,
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  fontFamily: K.fMono,
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  color: active ? K.copperHi : K.inkDim,
                }}
              >
                Q{q} · {QUARTER_MONTHS[q]}
              </div>
              <div
                style={{
                  fontFamily: K.fMono,
                  fontSize: 9,
                  letterSpacing: '0.14em',
                  color: meta.tone,
                }}
              >
                {meta.label}
              </div>
            </Link>
          )
        })}
      </div>

      {isPeriodReviewEnabled() ? (
        <PeriodReviewLookBackLinks kind="quarter" planYear={loaded.planYear} selectedIndex={selectedQuarter} />
      ) : null}

      <Frame tone="raised" padding={20}>
        <QuarterReviewPanel
          year={loaded.planYear}
          quarter={selectedQuarter}
          initialWins={Array.isArray(selectedReview?.wins) ? (selectedReview!.wins as string[]) : undefined}
          initialChallenges={
            Array.isArray(selectedReview?.challenges) ? (selectedReview!.challenges as string[]) : undefined
          }
          initialPivots={selectedReview?.pivots ?? null}
          initialNextQuarterIntentions={selectedReview?.next_quarter_intentions ?? null}
          initialCompletedAt={selectedReview?.completed_at ?? null}
          initialAiSummary={selectedReview?.ai_summary ?? null}
          initialStatsSnapshot={
            selectedReview?.stats_snapshot && typeof selectedReview.stats_snapshot === 'object'
              ? (selectedReview.stats_snapshot as Record<string, number>)
              : null
          }
          priorStatsSnapshot={priorStatsSnapshot}
          priorQuarterLabel={priorQuarterLabel}
        />
      </Frame>
    </div>
  )
}
