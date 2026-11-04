import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { getUserProfileId } from '@/lib/ai/usage'
import { periodFor, type PeriodReviewPeriod } from '@/lib/period-review/periods'
import { addDays, periodFor as reflectionPeriodFor } from '@/lib/reflections/periods'
import { loadLookBackPreview } from '@/lib/period-review/preview'
import { todayISO } from '@/lib/today/get-today-context'

const querySchema = z.object({
  kind: z.enum(['week', 'month', 'quarter', 'year']),
  year: z.coerce.number().int().min(2000).max(2100),
  index: z.coerce.number().int().min(1).max(53),
})

/** The window a reflection covers. A year uses the whole calendar year; a week runs Monday to Sunday. */
function windowFor(kind: 'week' | 'month' | 'quarter' | 'year', year: number, index: number): PeriodReviewPeriod {
  if (kind === 'week') {
    // The preview only reads counts and named transits over the date range.
    const week = reflectionPeriodFor('week', year, index, 'UTC')
    return { kind: 'month', periodStart: week.start, periodEnd: addDays(week.end, -1), planYear: year, index: 1 }
  }
  if (kind === 'year') {
    // The preview only reads counts and named transits over the date range.
    return { kind: 'month', periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`, planYear: year, index: 1 }
  }
  return periodFor(kind, year, kind === 'quarter' ? Math.min(index, 4) : index)
}

/** What a reflection will draw on, before it's prepared. No model call. */
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const parsed = querySchema.safeParse({
    kind: url.searchParams.get('kind'),
    year: url.searchParams.get('year'),
    index: url.searchParams.get('index'),
  })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid period' }, { status: 400 })

  const profileId = await getUserProfileId(userId)
  if (!profileId) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  let window: PeriodReviewPeriod
  try { window = windowFor(parsed.data.kind, parsed.data.year, parsed.data.index) }
  catch { return NextResponse.json({ error: 'Invalid period' }, { status: 400 }) }
  if (window.periodEnd >= todayISO()) {
    return NextResponse.json({ ended: false, preview: null })
  }
  const preview = await loadLookBackPreview(profileId, window, (sources) => ({
    ...sources,
    monthBlueprintTheme: null,
    quarterBlueprintTheme: null,
  }))
  return NextResponse.json({ ended: true, preview })
}
