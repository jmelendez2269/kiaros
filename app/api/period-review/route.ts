import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { getUserProfileId } from '@/lib/ai/usage'
import { generatePeriodReviewSummary } from '@/lib/ai/period-review-generator'
import { countPeriodJournalEntries } from '@/lib/period-review/load-sources'
import { loadLookBackPreview } from '@/lib/period-review/preview'
import { isPeriodReviewEnabled } from '@/lib/feature-flags'
import {
  assertPeriodReviewVaultAvailable,
  isPeriodReviewVaultAvailable,
  loadCachedPeriodReview,
  PeriodReviewCacheStorageFullError,
  saveCachedPeriodReview,
} from '@/lib/period-review/cache'
import { periodReviewStorageFullApiMessage } from '@/lib/period-review/copy'
import { runPeriodReviewGeneration } from '@/lib/period-review/generate-and-cache'
import { assertPeriodReviewRateLimit } from '@/lib/period-review/rate-limit'
import { isPeriodEnded, periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
import { todayISO } from '@/lib/today/get-today-context'
import { parseLegacySummarySections } from '@/lib/period-review/report-schema'
import { requireActivePlannerAccess } from '@/lib/commerce/access'

export const maxDuration = 120

const querySchema = z.object({
  kind: z.enum(['month', 'quarter']),
  year: z.coerce.number().int().min(2000).max(2100),
  index: z.coerce.number().int().min(1).max(12),
})

function disabledResponse() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

function storageFullResponse() {
  return NextResponse.json(
    { error: 'storage_full', message: periodReviewStorageFullApiMessage() },
    { status: 409 },
  )
}

function serializeCached(entry: NonNullable<Awaited<ReturnType<typeof loadCachedPeriodReview>>>) {
  const sections = entry.sections ?? parseLegacySummarySections(entry.summary)
  return {
    summary: entry.summary,
    generatedAt: entry.generatedAt,
    model: entry.model,
    regenerations: entry.regenerations,
    sections,
    sourceChips: entry.sourceChips ?? { sky: [], plans: [], journal: [] },
  }
}

const COUNT_FAILED_MESSAGE = "We couldn't check your journal for this period. Please try again."

/** Count or null when the lookup fails, so a failure is never shown as "no entries". */
async function safeJournalEntryCount(profileId: string, period: ReturnType<typeof periodFor>) {
  try {
    return await countPeriodJournalEntries(profileId, period)
  } catch (error) {
    console.error('[period-review] journal count failed:', error)
    return null
  }
}

export async function GET(req: Request) {
  if (!isPeriodReviewEnabled()) return disabledResponse()

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    kind: url.searchParams.get('kind'),
    year: url.searchParams.get('year'),
    index: url.searchParams.get('index'),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const kind = parsed.data.kind as PeriodReviewKind
  const index =
    kind === 'quarter' ? Math.min(4, Math.max(1, parsed.data.index)) : Math.min(12, Math.max(1, parsed.data.index))

  const period = periodFor(kind, parsed.data.year, index)
  const profileId = await getUserProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (!isPeriodEnded(todayISO(), period)) {
    return NextResponse.json({ error: 'This period has not ended yet' }, { status: 400 })
  }

  const cached = await loadCachedPeriodReview(profileId, period)
  const journalEntryCount = await safeJournalEntryCount(profileId, period)
  if (journalEntryCount === null) {
    return NextResponse.json({ error: COUNT_FAILED_MESSAGE }, { status: 503 })
  }
  const vaultAvailable = await isPeriodReviewVaultAvailable(profileId, period)
  // Before the first look back, show what it will draw on.
  const preview = cached ? null : await loadLookBackPreview(profileId, period)
  return NextResponse.json({
    preview,
    period: {
      kind: period.kind,
      year: period.planYear,
      index: period.index,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    },
    cached: cached ? serializeCached(cached) : null,
    journalEntryCount,
    vaultAvailable,
    storageFull: !vaultAvailable,
  })
}

export async function POST(req: Request) {
  if (!isPeriodReviewEnabled()) return disabledResponse()

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessError = await requireActivePlannerAccess(userId)
  if (accessError) return accessError

  const body = (await req.json().catch(() => ({}))) as { kind?: string; year?: number; index?: number; regenerate?: boolean }
  const parsed = querySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const kind = parsed.data.kind as PeriodReviewKind
  const index =
    kind === 'quarter' ? Math.min(4, Math.max(1, parsed.data.index)) : Math.min(12, Math.max(1, parsed.data.index))
  const period = periodFor(kind, parsed.data.year, index)

  const profileId = await getUserProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  if (!isPeriodEnded(todayISO(), period)) {
    return NextResponse.json({ error: 'This period has not ended yet' }, { status: 400 })
  }

  const existing = await loadCachedPeriodReview(profileId, period)
  if (existing && !body.regenerate) {
    const journalEntryCount = await safeJournalEntryCount(profileId, period)
    return NextResponse.json({
      ...serializeCached(existing),
      cached: true,
      journalEntryCount,
    })
  }

  try {
    const genResult = await runPeriodReviewGeneration({
      assertVaultAvailable: () => assertPeriodReviewVaultAvailable(profileId, period),
      generateSummary: async () => {
        await assertPeriodReviewRateLimit(profileId)
        return generatePeriodReviewSummary(profileId, period)
      },
      saveEntry: (entry) => saveCachedPeriodReview(profileId, period, entry),
      buildEntry: (generated) => ({
        summary: generated.summary,
        sections: generated.sections,
        sourceChips: generated.sourceChips,
        generatedAt: new Date().toISOString(),
        model: generated.model,
        regenerations: (existing?.regenerations ?? 0) + (existing ? 1 : 0),
      }),
    })

    if (!genResult.ok) {
      return storageFullResponse()
    }

    const journalEntryCount = await safeJournalEntryCount(profileId, period)

    return NextResponse.json({
      ...serializeCached(genResult.entry),
      cached: false,
      journalEntryCount,
    })
  } catch (e) {
    if (e instanceof PeriodReviewCacheStorageFullError) {
      return storageFullResponse()
    }
    throw e
  }
}
