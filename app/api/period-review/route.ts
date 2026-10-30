import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { getUserProfileId } from '@/lib/ai/usage'
import { generatePeriodReviewSummary } from '@/lib/ai/period-review-generator'
import { countPeriodJournalEntries } from '@/lib/period-review/load-sources'
import { isPeriodReviewEnabled } from '@/lib/feature-flags'
import { loadCachedPeriodReview, saveCachedPeriodReview } from '@/lib/period-review/cache'
import { assertPeriodReviewRateLimit } from '@/lib/period-review/rate-limit'
import { periodFor, type PeriodReviewKind } from '@/lib/period-review/periods'
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

  const cached = await loadCachedPeriodReview(profileId, period)
  const journalEntryCount = await countPeriodJournalEntries(profileId, period)
  return NextResponse.json({
    period: {
      kind: period.kind,
      year: period.planYear,
      index: period.index,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    },
    cached: cached
      ? {
          summary: cached.summary,
          generatedAt: cached.generatedAt,
          model: cached.model,
          regenerations: cached.regenerations,
        }
      : null,
    journalEntryCount,
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

  const existing = await loadCachedPeriodReview(profileId, period)
  if (existing && !body.regenerate) {
    const journalEntryCount = await countPeriodJournalEntries(profileId, period)
    return NextResponse.json({
      summary: existing.summary,
      generatedAt: existing.generatedAt,
      model: existing.model,
      cached: true,
      journalEntryCount,
    })
  }

  await assertPeriodReviewRateLimit(profileId)

  const generated = await generatePeriodReviewSummary(profileId, period)
  const entry = {
    summary: generated.summary,
    generatedAt: new Date().toISOString(),
    model: generated.model,
    regenerations: (existing?.regenerations ?? 0) + (existing ? 1 : 0),
  }
  await saveCachedPeriodReview(profileId, period, entry)

  const journalEntryCount = await countPeriodJournalEntries(profileId, period)

  return NextResponse.json({
    summary: entry.summary,
    generatedAt: entry.generatedAt,
    model: entry.model,
    cached: false,
    journalEntryCount: journalEntryCount,
  })
}
