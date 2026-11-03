import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

import { getUserProfileId } from '@/lib/ai/usage'
import { requireActivePlannerAccess } from '@/lib/commerce/access'
import { assertPeriodReviewRateLimit } from '@/lib/period-review/rate-limit'
import { findCycleForUser, generateSkyCycleReview, loadSkyCycleReview, saveSkyCycleReview } from '@/lib/sky-cycles/review'
import { todayISO } from '@/lib/today/get-today-context'

export const maxDuration = 120

const cycleIdSchema = z.string().trim().min(1).max(200)

const GENERATION_FAILED = "We couldn't write this look back just now. Please try again in a moment."
const NOT_ENDED = 'This cycle has not ended yet. Its look back opens the day after it ends.'

function serialize(entry: NonNullable<Awaited<ReturnType<typeof loadSkyCycleReview>>>) {
  return {
    sections: entry.sections ?? {},
    sourceChips: entry.sourceChips ?? { sky: [], plans: [], journal: [] },
    generatedAt: entry.generatedAt,
    regenerations: entry.regenerations,
  }
}

async function resolve(cycleIdRaw: unknown) {
  const { userId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const
  const parsed = cycleIdSchema.safeParse(cycleIdRaw)
  if (!parsed.success) return { error: NextResponse.json({ error: 'Invalid cycle' }, { status: 400 }) } as const
  const profileId = await getUserProfileId(userId)
  if (!profileId) return { error: NextResponse.json({ error: 'Profile not found' }, { status: 404 }) } as const
  const today = todayISO()
  const cycle = await findCycleForUser(profileId, parsed.data, today)
  if (!cycle) return { error: NextResponse.json({ error: 'Cycle not found' }, { status: 404 }) } as const
  if (cycle.endDate >= today) return { error: NextResponse.json({ error: NOT_ENDED }, { status: 400 }) } as const
  return { userId, profileId, cycle } as const
}

export async function GET(req: Request) {
  const r = await resolve(new URL(req.url).searchParams.get('cycleId'))
  if ('error' in r) return r.error
  try {
    const cached = await loadSkyCycleReview(r.profileId, r.cycle.id)
    return NextResponse.json({ cycle: r.cycle, cached: cached ? serialize(cached) : null })
  } catch (error) {
    console.error('[sky-cycles/review] load failed:', error)
    return NextResponse.json({ error: "We couldn't load this look back. Please try again." }, { status: 503 })
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { cycleId?: unknown; regenerate?: unknown }
  const r = await resolve(body.cycleId)
  if ('error' in r) return r.error

  const accessError = await requireActivePlannerAccess(r.userId)
  if (accessError) return accessError

  try {
    const existing = await loadSkyCycleReview(r.profileId, r.cycle.id)
    if (existing && body.regenerate !== true) {
      return NextResponse.json({ cycle: r.cycle, cached: serialize(existing) })
    }

    try {
      await assertPeriodReviewRateLimit(r.profileId)
    } catch (limitError) {
      const message = limitError instanceof Error ? limitError.message : GENERATION_FAILED
      return NextResponse.json({ error: message }, { status: 429 })
    }

    const generated = await generateSkyCycleReview(r.profileId, r.cycle)
    const entry = {
      summary: generated.summary,
      sections: generated.sections,
      sourceChips: generated.sourceChips,
      generatedAt: new Date().toISOString(),
      model: generated.model,
      regenerations: (existing?.regenerations ?? 0) + (existing ? 1 : 0),
    }
    await saveSkyCycleReview(r.profileId, r.cycle, entry)
    return NextResponse.json({ cycle: r.cycle, cached: serialize(entry) })
  } catch (error) {
    console.error('[sky-cycles/review] generation failed:', error)
    return NextResponse.json({ error: GENERATION_FAILED }, { status: 500 })
  }
}
